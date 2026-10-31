// Spec: odd/tasks/owner-notification-test-zukki.md T4 (S9, S11 tenant isolation).
// One device belongs to one user: registering a token removes the same token
// from every other user; DELETE removes the caller's row; malformed bodies
// never touch the database.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/index.ts";
import type { V1Deps } from "../src/routes/v1.ts";
import { fakeSupabase, type FakeCall } from "./helpers/fake-supabase.ts";

const MARIO = "20000000-0000-4000-8000-000000000001";
const TOKEN = "owner-access-token-0123456789";
const SERVER_KEY = "server-key-0123456789-0123456789-0123";
const EXPO = "ExponentPushToken[device1]";

function setup(
  respondOwner: (call: FakeCall) => { status?: number; body: unknown },
  respondService: (call: FakeCall) => { status?: number; body: unknown } = () => ({ body: [] }),
) {
  const owner = fakeSupabase(respondOwner);
  const service = fakeSupabase(respondService);
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
  return { call, ownerCalls: owner.calls, serviceCalls: service.calls };
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });
const del = (body: unknown): RequestInit => ({ method: "DELETE", body: JSON.stringify(body) });

describe("push token ownership (S11)", () => {
  it("registering a token held by another user leaves it only under the new user", async () => {
    const { call, ownerCalls, serviceCalls } = setup(
      () => ({ body: [{ user_id: MARIO, expo_token: EXPO, platform: "ios" }] }),
      () => ({ body: [] }),
    );

    const res = await call("/push-tokens", post({ expoToken: EXPO, platform: "ios" }));

    assert.equal(res.status, 200);
    const removals = serviceCalls.filter((one) => one.method === "DELETE" && one.path === "/rest/v1/push_tokens");
    assert.equal(removals.length, 1);
    assert.equal(removals[0]?.query.get("expo_token"), `eq.${EXPO}`);
    assert.equal(removals[0]?.query.get("user_id"), `neq.${MARIO}`);
    const upserts = ownerCalls.filter((one) => one.method === "POST" && one.path === "/rest/v1/push_tokens");
    assert.equal(upserts.length, 1);
    assert.deepEqual(upserts[0]?.body, { user_id: MARIO, expo_token: EXPO, platform: "ios" });
  });

  it("DELETE removes only the caller's row", async () => {
    const { call, ownerCalls, serviceCalls } = setup(() => ({ body: [{ user_id: MARIO, expo_token: EXPO }] }));

    const res = await call("/push-tokens", del({ expoToken: EXPO }));

    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { success: true, data: { expoToken: EXPO } });
    assert.equal(ownerCalls.length, 1);
    assert.equal(ownerCalls[0]?.method, "DELETE");
    assert.equal(ownerCalls[0]?.path, "/rest/v1/push_tokens");
    assert.equal(ownerCalls[0]?.query.get("user_id"), `eq.${MARIO}`);
    assert.equal(ownerCalls[0]?.query.get("expo_token"), `eq.${EXPO}`);
    assert.deepEqual(serviceCalls, []);
  });

  it("DELETE with a malformed body answers 400 without touching the database", async () => {
    const { call, ownerCalls, serviceCalls } = setup(() => ({ body: [] }));

    assert.equal((await call("/push-tokens", del({}))).status, 400);
    assert.equal((await call("/push-tokens", del({ expoToken: "not-a-token" }))).status, 400);

    assert.deepEqual(ownerCalls, []);
    assert.deepEqual(serviceCalls, []);
  });
});
