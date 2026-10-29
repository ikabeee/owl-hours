// WhatsApp-side endpoints: server key required, inbound messages stored
// once, and outputs shaped for the payloads.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/index.ts";
import type { V1Deps } from "../src/routes/v1.ts";
import { displayNameFromProfile } from "../src/services/whatsapp-service.ts";
import { fakeSupabase, pgError, type FakeCall, type FakeReply } from "./helpers/fake-supabase.ts";

const SERVER_KEY = "server-key-0123456789-0123456789-0123";
const ANA_CHAT = "40000000-0000-4000-8000-000000000001";
const NORTHSIDE = "10000000-0000-4000-8000-000000000001";
const EASTSIDE = "10000000-0000-4000-8000-000000000002";

function setup(respond: (call: FakeCall) => FakeReply, extra: Partial<V1Deps> = {}) {
  const service = fakeSupabase(respond);
  const deps: V1Deps = {
    authenticate: async () => null,
    serviceDb: service.client,
    serverKey: SERVER_KEY,
    ...extra,
  };
  const { app } = createApp({ v1: deps });
  const call = (path: string, init: RequestInit = {}) =>
    app.request(`/v1/internal${path}`, {
      ...init,
      headers: { "x-zukki-key": SERVER_KEY, "content-type": "application/json", ...init.headers },
    });
  return { app, call, calls: service.calls };
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

describe("/v1/internal auth", () => {
  it("needs the server key", async () => {
    const { app, calls } = setup(() => ({ body: [] }));
    assert.equal((await app.request("/v1/internal/outbox/claim", post({}))).status, 401);
    const wrong = await app.request("/v1/internal/outbox/claim", { ...post({}), headers: { "x-zukki-key": "x".repeat(40) } });
    assert.equal(wrong.status, 401);
    assert.equal(calls.length, 0);
  });

  it("does not accept an owner token in place of the key", async () => {
    const { app } = setup(() => ({ body: [] }));
    const res = await app.request("/v1/internal/outbox/claim", {
      ...post({}),
      headers: { authorization: "Bearer owner-access-token-0123456789" },
    });
    assert.equal(res.status, 401);
  });
});

describe("/v1/internal inbound", () => {
  it("stores a message once and shortens the profile name", async () => {
    const { call, calls } = setup(() => ({
      body: [{
        conversation_id: ANA_CHAT,
        message_id: "70000000-0000-4000-8000-000000000010",
        duplicate: false,
        is_new_conversation: true,
        open_tenant_id: null,
      }],
    }));
    const res = await call("/inbound", post({
      waId: "15550000001",
      waMessageId: "wamid.HBgL",
      kind: "text",
      text: "My toilet won't stop running",
      profileName: "Ana Lopez Garcia",
      receivedAt: "2026-11-03T05:04:00Z",
    }));
    assert.equal(res.status, 200);
    assert.equal(calls[0]?.path, "/rest/v1/rpc/record_inbound_message");
    assert.deepEqual(calls[0]?.body, {
      p_wa_id: "15550000001",
      p_wa_message_id: "wamid.HBgL",
      p_kind: "text",
      p_body: "My toilet won't stop running",
      p_payload: null,
      p_media_id: null,
      p_profile_name: "Ana G.",
      p_at: "2026-11-03T05:04:00Z",
    });
    const body = (await res.json()) as { data: Record<string, unknown> };
    assert.deepEqual(body.data, {
      conversationId: ANA_CHAT,
      messageId: "70000000-0000-4000-8000-000000000010",
      duplicate: false,
      isNewConversation: true,
      businessChatOpen: false,
      businessId: null,
    });
  });

  it("validates each message kind before the database", async () => {
    const { call, calls } = setup(() => ({ body: [] }));
    const base = { waId: "15550000001", waMessageId: "wamid.1" };
    assert.equal((await call("/inbound", post({ ...base, kind: "text" }))).status, 400, "text needs text");
    assert.equal((await call("/inbound", post({ ...base, kind: "media" }))).status, 400, "media needs mediaId");
    assert.equal((await call("/inbound", post({ ...base, kind: "button_reply", payload: {} }))).status, 400, "reply id");
    assert.equal((await call("/inbound", post({ ...base, waId: "+1555", kind: "text", text: "x" }))).status, 400);
    assert.equal((await call("/inbound", post({ ...base, kind: "location", text: "x" }))).status, 400);
    assert.equal(calls.length, 0);
  });

  it("rejects coordinates out of range", async () => {
    const { call, calls } = setup(() => ({ body: [] }));
    const res = await call(`/conversations/${ANA_CHAT}/location`, post({ waMessageId: "wamid.2", latitude: 91, longitude: 0 }));
    assert.equal(res.status, 400);
    assert.equal(calls.length, 0);
  });
});

describe("/v1/internal matching", () => {
  it("returns what the suggestion card shows", async () => {
    const { call, calls } = setup((c) => {
      if (c.path.endsWith("/rpc/search_directory_for_conversation")) {
        return {
          body: [{
            tenant_id: NORTHSIDE, slug: "northside", name: "Northside Plumbing", short_name: "Northside",
            rating: 4.9, review_count: 128, night_jobs: true, open_now: false, eta_minutes: 40, distance_km: 1.2,
          }],
        };
      }
      return {
        body: [
          { tenant_id: NORTHSIDE, item: "Visit", kind: "callout", min_amount: 45, max_amount: 45, currency: "USD", conditions: null },
          { tenant_id: NORTHSIDE, item: "Night fee", kind: "night_fee", min_amount: 25, max_amount: 25, currency: "USD", conditions: "10 PM-7 AM" },
          { tenant_id: NORTHSIDE, item: "Leak repair", kind: "repair_range", min_amount: 60, max_amount: 90, currency: "USD", conditions: null },
        ],
      };
    });
    const res = await call(`/conversations/${ANA_CHAT}/matches?category=plumbing&exclude=${EASTSIDE}`);
    assert.equal(res.status, 200);
    assert.deepEqual((calls[0]?.body as { p_exclude: string[] }).p_exclude, [EASTSIDE]);
    const [card] = ((await res.json()) as { data: Record<string, unknown>[] }).data;
    assert.deepEqual(card, {
      businessId: NORTHSIDE,
      name: "Northside Plumbing",
      shortName: "Northside",
      rating: 4.9,
      reviews: 128,
      distanceKm: 1.2,
      etaMinutes: 40,
      openNow: false,
      takesNightJobs: true,
      currency: "USD",
      visit: 45,
      nightFee: { amount: 25, window: "10 PM-7 AM" },
      repairFrom: 60,
      repairLabel: "Leak repair",
    });
  });

  it("accepts only directory categories", async () => {
    const { call } = setup(() => ({ body: [] }));
    assert.equal((await call(`/conversations/${ANA_CHAT}/matches?category=weapons`)).status, 400);
  });

  it("maps a second open offer to 409", async () => {
    const { call } = setup(() => pgError("23505", "duplicate key value violates unique constraint", 409));
    const res = await call(`/conversations/${ANA_CHAT}/connect`, post({ businessId: NORTHSIDE }));
    assert.equal(res.status, 409);
  });

  it("approving an old quote is a 422", async () => {
    const { call } = setup(() => pgError("22023", "quote is superseded"));
    const res = await call("/quotes/a0000000-0000-4000-8000-000000000001/approve", { method: "POST" });
    assert.equal(res.status, 422);
    assert.equal(((await res.json()) as { error: { message: string } }).error.message, "quote is superseded");
  });
});

describe("/v1/internal outbox", () => {
  it("claims messages and records WhatsApp's answer", async () => {
    const { call, calls } = setup((c) =>
      c.path.endsWith("/rpc/claim_outbox")
        ? { body: [{ id: "70000000-0000-4000-8000-000000000020", waId: "15550000001", body: "On my way" }] }
        : { body: { id: "70000000-0000-4000-8000-000000000020", delivery: "sent", wa_message_id: "wamid.out" } },
    );
    const claimed = await call("/outbox/claim", post({ limit: 5 }));
    assert.equal(((await claimed.json()) as { data: unknown[] }).data.length, 1);
    assert.deepEqual(calls[0]?.body, { p_limit: 5 });
    const result = await call("/messages/70000000-0000-4000-8000-000000000020/result", post({ waMessageId: "wamid.out" }));
    assert.equal(result.status, 200);
    assert.deepEqual(((await result.json()) as { data: unknown }).data, {
      id: "70000000-0000-4000-8000-000000000020",
      status: "sent",
      waMessageId: "wamid.out",
    });
  });

  it("accepts only delivered, read or failed receipts", async () => {
    const { call } = setup(() => ({ body: true }));
    assert.equal((await call("/delivery-status", post({ waMessageId: "wamid.out", status: "sent" }))).status, 400);
    const ok = await call("/delivery-status", post({ waMessageId: "wamid.out", status: "read" }));
    assert.deepEqual(((await ok.json()) as { data: unknown }).data, { updated: true });
  });

  it("answers 503 for assist until the models are connected", async () => {
    const { call } = setup(() => ({ body: [] }));
    const res = await call(`/conversations/${ANA_CHAT}/assist`, post({ type: "text", text: "hi" }));
    assert.equal(res.status, 503);
  });
});

describe("displayNameFromProfile", () => {
  it("keeps a first name and last initial only", () => {
    assert.equal(displayNameFromProfile("Ana Lopez Garcia"), "Ana G.");
    assert.equal(displayNameFromProfile("  pedro  "), "pedro");
    assert.equal(displayNameFromProfile("Álvaro Ñuñez"), "Álvaro Ñ.");
    assert.equal(displayNameFromProfile(""), null);
    assert.equal(displayNameFromProfile(undefined), null);
  });
});
