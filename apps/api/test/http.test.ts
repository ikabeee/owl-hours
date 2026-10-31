// Login check against Supabase Auth, and the polish safety net.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ChatChoice } from "@owl-hours/meta-models";
import { createSupabaseAuthenticator, requireServerKey } from "../src/http/auth.ts";
import { keepsEveryNumber, polishOwnerMessage } from "../src/services/polish.ts";
import { fakeFetch } from "./helpers/fake-supabase.ts";

const MARIO = "20000000-0000-4000-8000-000000000001";

describe("createSupabaseAuthenticator", () => {
  it("checks the token with Supabase Auth and queries as that user", async () => {
    const { fetchImpl, calls } = fakeFetch((c) =>
      c.path === "/auth/v1/user" ? { body: { id: MARIO, aud: "authenticated", role: "authenticated" } } : { body: [] },
    );
    const authenticate = createSupabaseAuthenticator({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "anon-key-0123456789-0123456789",
      fetch: fetchImpl,
    });
    const session = await authenticate("owner-access-token-0123456789");
    assert.equal(session?.userId, MARIO);
    await session?.db.from("jobs").select("id");
    assert.equal(calls[1]?.headers.get("authorization"), "Bearer owner-access-token-0123456789");
  });

  it("returns null for a bad token and throws when Auth is down", async () => {
    const config = { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon-key-0123456789-0123456789" };
    const bad = createSupabaseAuthenticator({
      ...config,
      fetch: fakeFetch(() => ({ status: 401, body: { code: 401, msg: "invalid JWT" } })).fetchImpl,
    });
    assert.equal(await bad("expired-token-0123456789-0123"), null);
    const down = createSupabaseAuthenticator({
      ...config,
      fetch: fakeFetch(() => ({ status: 503, body: { code: 503, msg: "unavailable" } })).fetchImpl,
    });
    await assert.rejects(down("any-token-0123456789-0123456789"), /unavailable/);
  });

  it("refuses a short server key at startup", () => {
    assert.throws(() => requireServerKey("short"), /32 characters/);
  });
});

describe("polishOwnerMessage", () => {
  const answer = (content: string) => async (): Promise<ChatChoice> => ({
    finishReason: "stop",
    message: { role: "assistant", content },
  });

  it("keeps a rewrite that preserves every number", async () => {
    const polished = await polishOwnerMessage(
      answer(JSON.stringify({ language: "en", text: "Mario can be there at 12:55 AM. Visit $45, repair $60-90." })),
      "mario there 12:55, visit 45, repair 60-90",
    );
    assert.equal(polished?.language, "en");
  });

  it("drops a rewrite that changes a price or time", async () => {
    const changed = await polishOwnerMessage(
      answer(JSON.stringify({ language: "en", text: "Mario can be there at 1:00 AM. Visit $40." })),
      "mario there 12:55, visit 45",
    );
    assert.equal(changed, null);
  });

  it("drops output that is not the expected JSON", async () => {
    assert.equal(await polishOwnerMessage(answer("Sure! Here you go"), "visit 45"), null);
    assert.equal(await polishOwnerMessage(answer(JSON.stringify({ text: "visit 45" })), "visit 45"), null);
  });

  it("counts repeated numbers", () => {
    assert.equal(keepsEveryNumber("45 and 45", "only 45"), false);
    assert.equal(keepsEveryNumber("45 and 45", "45, then 45"), true);
  });
});

// The mapper is shared by jobs, chats, account and content endpoints.
it("maps database permission failures to a generic action message", async () => {
  const { toHttpError } = await import("../src/http/respond.ts");
  const { RepositoryError } = await import("../src/db/repository.ts");
  const error = toHttpError(new RepositoryError("private policy details", "42501"));
  assert.equal(error.status, 403);
  assert.equal(error.message, "You don't have permission to perform this action.");
});

it("maps explicit RPC conflicts without using the transient serialization error", async () => {
  const { toHttpError } = await import("../src/http/respond.ts");
  const { RepositoryError } = await import("../src/db/repository.ts");
  const domainConflict = toHttpError(new RepositoryError("The draft changed.", "PT409"));
  assert.equal(domainConflict.status, 409);
  assert.equal(domainConflict.code, "changed_since_read");
  assert.equal(domainConflict.message, "The draft changed.");
  // Genuine database serialization failures retain their existing mapping.
  assert.equal(toHttpError(new RepositoryError("serialization failure", "40001")).status, 409);
});
