// The Meta webhook: verification handshake, signature check, and the
// answer Meta sees when storing fails (so it retries).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { WebhookEvent } from "@owl-hours/whatsapp";
import { createApp } from "../src/index.ts";

const VERIFY_TOKEN = "verify-token-for-tests-0123";
const APP_SECRET = "app-secret-for-tests-0123";
const quiet = { info: () => {}, warn: () => {}, error: () => {} };

function setup(handle: (events: WebhookEvent[]) => Promise<void> = async () => {}) {
  const seen: WebhookEvent[][] = [];
  const { app } = createApp({
    whatsapp: {
      verifyToken: VERIFY_TOKEN,
      appSecret: APP_SECRET,
      handle: async (events) => {
        seen.push(events);
        await handle(events);
      },
      log: quiet,
    },
  });
  return { app, seen };
}

const sign = (raw: string) => `sha256=${createHmac("sha256", APP_SECRET).update(raw).digest("hex")}`;
const body = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [{
    id: "WABA",
    changes: [{
      field: "messages",
      value: {
        contacts: [{ wa_id: "15551234567", profile: { name: "Ana Lopez" } }],
        messages: [{ from: "15551234567", id: "wamid.1", timestamp: "1761696000", type: "text", text: { body: "Help" } }],
      },
    }],
  }],
});
const postSigned = (raw: string, signature = sign(raw)): RequestInit => ({
  method: "POST",
  body: raw,
  headers: { "content-type": "application/json", "x-hub-signature-256": signature },
});

describe("GET /webhooks/whatsapp", () => {
  it("echoes the challenge when the verify token matches", async () => {
    const { app } = setup();
    const res = await app.request(`/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=12345`);
    assert.equal(res.status, 200);
    assert.equal(await res.text(), "12345");
  });

  it("refuses a wrong or missing token", async () => {
    const { app } = setup();
    assert.equal((await app.request("/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=1")).status, 403);
    assert.equal((await app.request("/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=1")).status, 403);
  });
});

describe("POST /webhooks/whatsapp", () => {
  it("stores signed events and answers 200", async () => {
    const { app, seen } = setup();
    const res = await app.request("/webhooks/whatsapp", postSigned(body));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { received: 1 });
    assert.equal(seen[0]?.[0]?.type, "message");
  });

  it("rejects a bad or missing signature before reading anything", async () => {
    const { app, seen } = setup();
    assert.equal((await app.request("/webhooks/whatsapp", postSigned(body, sign(`${body}x`)))).status, 401);
    assert.equal((await app.request("/webhooks/whatsapp", { method: "POST", body })).status, 401);
    assert.equal(seen.length, 0);
  });

  it("answers 500 when storing fails so Meta retries", async () => {
    const { app } = setup(async () => {
      throw new Error("database down");
    });
    assert.equal((await app.request("/webhooks/whatsapp", postSigned(body))).status, 500);
  });

  it("answers 503 when WhatsApp is not configured", async () => {
    const { app } = createApp();
    assert.equal((await app.request("/webhooks/whatsapp", postSigned(body))).status, 503);
    assert.equal((await app.request("/webhooks/whatsapp?hub.mode=subscribe")).status, 503);
  });
});
