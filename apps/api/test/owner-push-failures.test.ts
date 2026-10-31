// Spec: odd/tasks/owner-notification-test-zukki.md T4 (S11). A push failure is
// logged and never blocks or rolls back the offer: Expo 503, a network error
// and an error ticket each produce one warning carrying the offer id and the
// sent/failed/removed counts, and the offer still stands. A hanging Expo call
// is aborted by the push timeout.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendOfferPush, type BuiltRequestPush, type OwnerPushToken } from "../src/services/owner-push.ts";
import { connectBusiness } from "../src/services/whatsapp-service.ts";
import { fakeSupabase } from "./helpers/fake-supabase.ts";

const CONVERSATION = "30000000-0000-4000-8000-000000000001";
const BUSINESS = "10000000-0000-4000-8000-000000000001";
const OFFER = "40000000-0000-4000-8000-000000000001";
const USER = "20000000-0000-4000-8000-000000000001";
const EXPO = "ExponentPushToken[aaa]";

const NOTIFICATION: BuiltRequestPush = {
  title: "Urgent: leaking toilet, 1.2 km",
  body: "Water is spreading. Accept within 5 minutes or Zukki offers it to another business.",
  data: { requestId: OFFER, category: "request" },
  channelId: "urgent-requests",
  image: null,
};

function memoryStore(tokens: OwnerPushToken[]) {
  return {
    listTokens: async () => tokens,
    removeToken: async () => {},
  };
}

function token(): OwnerPushToken {
  return { userId: USER, expoToken: EXPO, platform: "ios" };
}

function offerDb() {
  return fakeSupabase((call) => {
    if (call.path === "/rest/v1/rpc/create_handoff") {
      return { body: { id: OFFER, attempt: 1, expires_at: "2026-10-31T00:05:00.000Z", distance_km: 1.2 } };
    }
    if (call.path === "/rest/v1/conversations") {
      return { body: { title: "leaking toilet", summary: "Water is spreading", urgency: "now" } };
    }
    if (call.path === "/rest/v1/media") {
      return { body: [] };
    }
    if (call.path === "/rest/v1/tenant_users") {
      return { body: [{ user_id: USER }] };
    }
    if (call.path === "/rest/v1/push_tokens") {
      return { body: [{ user_id: USER, expo_token: EXPO, platform: "ios" }] };
    }
    return { body: [] };
  });
}

function captureWarnings() {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map((part) => String(part)).join(" "));
  };
  return { warnings, restore: () => void (console.warn = original) };
}

describe("connectBusiness push logging (S11)", () => {
  it("an Expo 503 produces one warning and the offer still stands", async () => {
    const { client } = offerDb();
    const { warnings, restore } = captureWarnings();
    try {
      const push = (async () => Response.json({ data: [] }, { status: 503 })) as typeof fetch;

      const offer = await connectBusiness(
        client as SupabaseClient,
        { conversationId: CONVERSATION, businessId: BUSINESS },
        { push },
      );

      assert.equal(offer.offerId, OFFER);
      assert.equal(warnings.length, 1);
      assert.match(warnings[0] ?? "", new RegExp(OFFER));
      assert.match(warnings[0] ?? "", /sent=0/);
      assert.match(warnings[0] ?? "", /failed=1/);
      assert.match(warnings[0] ?? "", /removed=0/);
    } finally {
      restore();
    }
  });

  it("a network error produces one warning and the offer still stands", async () => {
    const { client } = offerDb();
    const { warnings, restore } = captureWarnings();
    try {
      const push = (async () => {
        throw new Error("network down");
      }) as typeof fetch;

      const offer = await connectBusiness(
        client as SupabaseClient,
        { conversationId: CONVERSATION, businessId: BUSINESS },
        { push },
      );

      assert.equal(offer.offerId, OFFER);
      assert.equal(warnings.length, 1);
      assert.match(warnings[0] ?? "", new RegExp(OFFER));
      assert.match(warnings[0] ?? "", /failed=1/);
    } finally {
      restore();
    }
  });

  it("an error ticket produces one warning and the offer still stands", async () => {
    const { client } = offerDb();
    const { warnings, restore } = captureWarnings();
    try {
      const push = (async () =>
        Response.json({ data: [{ status: "error", message: "too big", details: { error: "MessageTooBig" } }] })) as typeof fetch;

      const offer = await connectBusiness(
        client as SupabaseClient,
        { conversationId: CONVERSATION, businessId: BUSINESS },
        { push },
      );

      assert.equal(offer.offerId, OFFER);
      assert.equal(warnings.length, 1);
      assert.match(warnings[0] ?? "", new RegExp(OFFER));
      assert.match(warnings[0] ?? "", /sent=0/);
      assert.match(warnings[0] ?? "", /failed=1/);
    } finally {
      restore();
    }
  });

  it("a clean send logs no warning", async () => {
    const { client } = offerDb();
    const { warnings, restore } = captureWarnings();
    try {
      const push = (async () => Response.json({ data: [{ status: "ok", id: "t1" }] })) as typeof fetch;

      const offer = await connectBusiness(
        client as SupabaseClient,
        { conversationId: CONVERSATION, businessId: BUSINESS },
        { push },
      );

      assert.equal(offer.offerId, OFFER);
      assert.deepEqual(warnings, []);
    } finally {
      restore();
    }
  });
});

describe("sendOfferPush timeout", () => {
  it("a hanging Expo call is aborted and counts as a failure", async () => {
    const push = ((url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      })) as typeof fetch;
    const raced = await Promise.race([
      sendOfferPush(memoryStore([token()]), push, { businessId: BUSINESS, notification: NOTIFICATION }, { timeoutMs: 50 }),
      new Promise<string>((resolve) => setTimeout(() => resolve("timed-out"), 3000)),
    ]);

    assert.notEqual(raced, "timed-out", "the hanging fetch was never aborted");
    assert.deepEqual(raced, { sent: 0, failed: 1, removed: [] });
  });
});
