// Spec: odd/tasks/owner-notification-test-zukki.md T4 (S10, S11). Sending the offer
// push: only the offered business's owners get it (tenant isolation), a failing push
// never fails the send, and tokens Expo reports as DeviceNotRegistered are deleted.
// The Expo push service travels as an injected fetch: no network in tests.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BuiltRequestPush, OwnerPushToken } from "../src/services/owner-push.ts";
import { createSupabasePushTokenStore, sendOfferPush } from "../src/services/owner-push.ts";
import { fakeSupabase } from "./helpers/fake-supabase.ts";

const BIZ_A = "10000000-0000-4000-8000-000000000001";
const BIZ_B = "10000000-0000-4000-8000-000000000002";
const USER_A1 = "20000000-0000-4000-8000-000000000001";
const USER_A2 = "20000000-0000-4000-8000-000000000002";
const USER_B = "20000000-0000-4000-8000-000000000003";

const TOKENS = [
  { user_id: USER_A1, expo_token: "ExponentPushToken[aaa]", platform: "ios" },
  { user_id: USER_A2, expo_token: "ExponentPushToken[bbb]", platform: "android" },
  { user_id: USER_B, expo_token: "ExponentPushToken[ccc]", platform: "ios" },
];
const MEMBERSHIPS = [
  { user_id: USER_A1, tenant_id: BIZ_A },
  { user_id: USER_A2, tenant_id: BIZ_A },
  { user_id: USER_B, tenant_id: BIZ_B },
];

const NOTIFICATION: BuiltRequestPush = {
  title: "Urgent: leaking toilet, 1.2 km",
  body: "Water is spreading. Accept within 5 minutes or Zukki offers it to another business.",
  data: { requestId: "req_ana", category: "request" },
  channelId: "urgent-requests",
  image: null,
};

// Emulates server-side tenant scoping: rows come back filtered by whichever tenant
// id the outgoing request carries; an unscoped request leaks every token.
function tenantScopedDb() {
  return fakeSupabase((call) => {
    const serialized = `${call.path}?${call.query.toString()} ${JSON.stringify(call.body)}`;
    const tenant = [BIZ_A, BIZ_B].find((id) => serialized.includes(id));
    const members = tenant ? MEMBERSHIPS.filter((m) => m.tenant_id === tenant) : MEMBERSHIPS;
    const users = new Set(members.map((m) => m.user_id));
    if (call.path.includes("push_tokens")) return { body: TOKENS.filter((token) => users.has(token.user_id)) };
    if (call.path.includes("tenant_users")) return { body: members };
    return { body: [] };
  });
}

function pushFetch(tickets: unknown[] | Error) {
  const calls: { url: string; init: RequestInit }[] = [];
  const push = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    if (tickets instanceof Error) throw tickets;
    return Response.json({ data: tickets });
  }) as typeof fetch;
  return { calls, push };
}

function recipientsOf(calls: { init: RequestInit }[]): string[] {
  return calls.flatMap((call) => {
    const body = JSON.parse(String(call.init.body)) as { to: string }[] | { to: string };
    const messages = Array.isArray(body) ? body : [body];
    return messages.map((message) => message.to);
  });
}

function memoryStore(tokens: OwnerPushToken[]) {
  const removed: string[] = [];
  return {
    removed,
    store: {
      listTokens: async () => tokens,
      removeToken: async (expoToken: string) => {
        removed.push(expoToken);
      },
    },
  };
}

describe("push token store tenant isolation (S11)", () => {
  it("lists only the offered business's owner tokens, and scopes the query to that business", async () => {
    const { client, calls } = tenantScopedDb();
    const store = createSupabasePushTokenStore(client as SupabaseClient);

    const tokens = await store.listTokens(BIZ_A);

    assert.deepEqual(
      tokens.map((token: { expoToken: string }) => token.expoToken).sort(),
      ["ExponentPushToken[aaa]", "ExponentPushToken[bbb]"],
    );
    assert.ok(
      calls.some((call) => `${call.query.toString()} ${JSON.stringify(call.body)}`.includes(BIZ_A)),
      "the outgoing query carries the offered business",
    );
    assert.ok(!JSON.stringify(tokens).includes(USER_B), "no token of the other business");
  });
});

describe("sendOfferPush (S10, S11)", () => {
  it("sends the notification to every token of the business's owners only", async () => {
    const { removed, store } = memoryStore([
      { userId: USER_A1, expoToken: "ExponentPushToken[aaa]", platform: "ios" },
      { userId: USER_A2, expoToken: "ExponentPushToken[bbb]", platform: "android" },
    ]);
    const { calls, push } = pushFetch([{ status: "ok", id: "t1" }, { status: "ok", id: "t2" }]);

    const summary = await sendOfferPush(store, push, { businessId: BIZ_A, notification: NOTIFICATION });

    assert.deepEqual(recipientsOf(calls).sort(), ["ExponentPushToken[aaa]", "ExponentPushToken[bbb]"]);
    assert.ok(calls.every((call) => call.url === "https://exp.host/--/api/v2/push/send"), "uses the Expo push API");
    for (const call of calls) {
      const body = JSON.parse(String(call.init.body)) as { title: string; data: unknown }[] | { title: string; data: unknown };
      for (const message of Array.isArray(body) ? body : [body]) {
        assert.equal(message.title, NOTIFICATION.title);
        assert.deepEqual(message.data, NOTIFICATION.data);
      }
    }
    assert.deepEqual(summary, { sent: 2, failed: 0, removed: [] });
    assert.deepEqual(removed, []);
  });

  it("a network error fails the send but never throws, so the offer stands", async () => {
    const { removed, store } = memoryStore([
      { userId: USER_A1, expoToken: "ExponentPushToken[aaa]", platform: "ios" },
      { userId: USER_A2, expoToken: "ExponentPushToken[bbb]", platform: "android" },
    ]);
    const { push } = pushFetch(new Error("network down"));

    const summary = await sendOfferPush(store, push, { businessId: BIZ_A, notification: NOTIFICATION });

    assert.deepEqual(summary, { sent: 0, failed: 2, removed: [] });
    assert.deepEqual(removed, [], "no token deleted on a transport failure");
  });

  it("an error ticket fails that token without deleting it", async () => {
    const { removed, store } = memoryStore([
      { userId: USER_A1, expoToken: "ExponentPushToken[aaa]", platform: "ios" },
    ]);
    const { push } = pushFetch([{ status: "error", message: "Message too big", details: { error: "MessageTooBig" } }]);

    const summary = await sendOfferPush(store, push, { businessId: BIZ_A, notification: NOTIFICATION });

    assert.deepEqual(summary, { sent: 0, failed: 1, removed: [] });
    assert.deepEqual(removed, []);
  });

  it("a DeviceNotRegistered ticket deletes that token only", async () => {
    const { removed, store } = memoryStore([
      { userId: USER_A1, expoToken: "ExponentPushToken[aaa]", platform: "ios" },
      { userId: USER_A2, expoToken: "ExponentPushToken[bbb]", platform: "android" },
    ]);
    const { push } = pushFetch([
      { status: "error", message: "device gone", details: { error: "DeviceNotRegistered" } },
      { status: "ok", id: "t2" },
    ]);

    const summary = await sendOfferPush(store, push, { businessId: BIZ_A, notification: NOTIFICATION });

    assert.deepEqual(summary, { sent: 1, failed: 1, removed: ["ExponentPushToken[aaa]"] });
    assert.deepEqual(removed, ["ExponentPushToken[aaa]"]);
  });
});
