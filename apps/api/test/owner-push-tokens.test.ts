// Spec: odd/tasks/owner-notification-test-zukki.md T4 (S9). The owner API upserts the
// owner's Expo push token for the signed-in user: it validates the token shape and
// the platform, and a second call with the same token updates instead of duplicating.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/index.ts";
import type { V1Deps } from "../src/routes/v1.ts";
import { fakeSupabase, type FakeCall } from "./helpers/fake-supabase.ts";

const MARIO = "20000000-0000-4000-8000-000000000001";
const TOKEN = "owner-access-token-0123456789";
const SERVER_KEY = "server-key-0123456789-0123456789-0123";

function setup(respond: (call: FakeCall) => { status?: number; body: unknown }) {
  const owner = fakeSupabase(respond);
  const service = fakeSupabase(() => ({ body: [] }));
  const deps: V1Deps = {
    authenticate: async (token) => (token === TOKEN ? { userId: MARIO, db: owner.client } : null),
    serviceDb: service.client,
    serverKey: SERVER_KEY,
  };
  const { app } = createApp({ v1: deps });
  const call = (path: string, init: RequestInit = {}) =>
    app.request(`/v1/owner${path}`, {
      ...init,
      headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json", ...init.headers },
    });
  return { call, calls: owner.calls };
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

describe("/v1/owner/push-tokens", () => {
  it("upserts the token for the signed-in user", async () => {
    const { call, calls } = setup(() => ({ body: [{ user_id: MARIO, expo_token: "ExponentPushToken[abc123]", platform: "ios" }] }));

    const res = await call("/push-tokens", post({ expoToken: "ExponentPushToken[abc123]", platform: "ios" }));

    assert.equal(res.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.method, "POST");
    assert.equal(calls[0]?.path, "/rest/v1/push_tokens");
    assert.deepEqual(calls[0]?.body, {
      user_id: MARIO,
      expo_token: "ExponentPushToken[abc123]",
      platform: "ios",
    });
  });

  it("accepts the ExpoPushToken shape as well", async () => {
    const { call, calls } = setup(() => ({ body: [] }));

    const res = await call("/push-tokens", post({ expoToken: "ExpoPushToken[abc123]", platform: "android" }));

    assert.equal(res.status, 200);
    assert.equal(calls.length, 1);
  });

  it("rejects a malformed token without touching the database", async () => {
    const { call, calls } = setup(() => ({ body: [] }));

    const res = await call("/push-tokens", post({ expoToken: "not-a-token", platform: "ios" }));

    assert.equal(res.status, 400);
    assert.equal(calls.length, 0);
  });

  it("rejects an unknown platform without touching the database", async () => {
    const { call, calls } = setup(() => ({ body: [] }));

    const res = await call("/push-tokens", post({ expoToken: "ExponentPushToken[abc123]", platform: "pager" }));

    assert.equal(res.status, 400);
    assert.equal(calls.length, 0);
  });

  it("does not duplicate: a second call with the same token upserts once more", async () => {
    const { call, calls } = setup(() => ({ body: [{ user_id: MARIO, expo_token: "ExponentPushToken[abc123]", platform: "ios" }] }));
    const body = post({ expoToken: "ExponentPushToken[abc123]", platform: "ios" });

    assert.equal((await call("/push-tokens", body)).status, 200);
    assert.equal((await call("/push-tokens", body)).status, 200);

    assert.equal(calls.length, 2);
    for (const tracked of calls) {
      assert.equal(tracked.method, "POST");
      assert.equal(tracked.path, "/rest/v1/push_tokens");
    }
  });
});
