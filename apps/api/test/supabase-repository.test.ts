// Supabase repository: the right PostgREST calls, rows validated before use,
// and database errors surfaced with their code. No network.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { RepositoryError, createSupabaseRepository } from "../src/db/repository.ts";

type Call = { method: string; url: URL; body: unknown };

function fakeSupabase(respond: (call: Call) => { status?: number; body: unknown }) {
  const calls: Call[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const call: Call = {
      method: init?.method ?? "GET",
      url: new URL(String(input instanceof Request ? input.url : input)),
      body: typeof init?.body === "string" ? JSON.parse(init.body) : null,
    };
    calls.push(call);
    const { status = 200, body } = respond(call);
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const client = createClient("https://example.supabase.co", "service-role-test-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchImpl },
  });
  return { repo: createSupabaseRepository(client), calls };
}

const ANA = "40000000-0000-4000-8000-000000000001";
const NORTHSIDE = "10000000-0000-4000-8000-000000000001";
const JOB = "80000000-0000-4000-8000-000000000001";

describe("createSupabaseRepository", () => {
  it("searches the directory by conversation through the RPC", async () => {
    const { repo, calls } = fakeSupabase(() => ({
      body: [
        {
          tenant_id: NORTHSIDE,
          slug: "northside",
          name: "Northside Plumbing",
          short_name: "Northside",
          rating: 4.9,
          review_count: 128,
          night_jobs: true,
          open_now: false,
          eta_minutes: 40,
          distance_km: "1.2",
        },
      ],
    }));

    const matches = await repo.searchDirectory({ conversationId: ANA, category: "plumbing", exclude: [] });

    assert.equal(matches[0]?.distanceKm, 1.2);
    assert.equal(matches[0]?.etaMinutes, 40);
    assert.equal(matches[0]?.shortName, "Northside");
    assert.equal(calls[0]?.method, "POST");
    assert.equal(calls[0]?.url.pathname, "/rest/v1/rpc/search_directory_for_conversation");
    assert.deepEqual(calls[0]?.body, { p_conversation_id: ANA, p_category: "plumbing", p_exclude: [] });
  });

  it("reads a job scoped by id and maps it", async () => {
    const { repo, calls } = fakeSupabase(() => ({
      body: [{ id: JOB, conversation_id: ANA, tenant_id: NORTHSIDE, state: "proposed" }],
    }));
    const job = await repo.getJob(JOB);
    assert.deepEqual(job, { id: JOB, conversationId: ANA, tenantId: NORTHSIDE, state: "proposed" });
    assert.equal(calls[0]?.url.pathname, "/rest/v1/jobs");
    assert.equal(calls[0]?.url.searchParams.get("id"), `eq.${JOB}`);
  });

  it("returns null for a missing job", async () => {
    const { repo } = fakeSupabase(() => ({ body: [] }));
    assert.equal(await repo.getJob(JOB), null);
  });

  it("rejects rows that do not match the expected shape", async () => {
    const { repo } = fakeSupabase(() => ({ body: [{ id: JOB, conversation_id: ANA, tenant_id: NORTHSIDE, state: "teleported" }] }));
    await assert.rejects(repo.getJob(JOB), /unexpected row/);
  });

  it("surfaces database errors with their Postgres code", async () => {
    const { repo } = fakeSupabase(() => ({
      status: 400,
      body: { code: "40001", message: "job is no longer proposed", details: null, hint: null },
    }));
    await assert.rejects(
      repo.recordJobTransition({ jobId: JOB, from: "proposed", to: "triaged", actor: "agent", reason: "x" }),
      (error: unknown) => {
        assert.ok(error instanceof RepositoryError);
        assert.equal(error.code, "40001");
        return true;
      },
    );
  });

  it("loads a business profile with its hours in one request", async () => {
    const { repo, calls } = fakeSupabase(() => ({
      body: [
        {
          id: NORTHSIDE,
          name: "Northside Plumbing",
          category: "plumbing",
          timezone: "America/Cancun",
          website: null,
          rating: 4.9,
          review_count: 128,
          accepts_now: true,
          night_jobs: true,
          business_hours: [{ weekday: 1, opens: "08:00:00", closes: "18:00:00" }],
        },
      ],
    }));
    const profile = await repo.getBusinessProfile(NORTHSIDE);
    assert.equal(profile?.hours.length, 1);
    assert.match(calls[0]?.url.searchParams.get("select") ?? "", /business_hours\(/);
  });
});
