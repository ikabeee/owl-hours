import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  disclosure,
  finding,
  locationRequest,
  offTopic,
  safetyMarkedFrame,
  typingIndicator,
  whatAreYouLookingFor,
  zukkiIsBack,
} from "../src/index.ts";

// RED phase (T1): the 15 builders above do not exist yet, so every test
// fails on the missing export. Expected bodies are read from
// handoff-ui/whatsapp/payloads/NN-*.json; T2 inlines them and deletes the
// JSONs (AGENTS.md handoff retirement rule).

const TO = "15551234567";
const INCOMING_WAMID = "wamid.IN1";
const MARKED_FRAME_URL = "https://example.supabase.co/marked.jpg";
const BUSINESS_NAME = "Northside Plumbing";

describe("payload conformance with handoff-ui/whatsapp/payloads", () => {
  it("01 disclosure matches 01-disclosure.json (S1, S3)", async () => {
    assert.deepEqual(disclosure({ to: TO }), await expected("01-disclosure.json", { customer_wa_id: TO }));
  });

  it("02 whatAreYouLookingFor matches 02-what-are-you-looking-for.json (S1, S3)", async () => {
    assert.deepEqual(whatAreYouLookingFor({ to: TO }), await expected("02-what-are-you-looking-for.json", { customer_wa_id: TO }));
  });

  it("03 typingIndicator matches 03-typing-indicator.json (S1, S3)", async () => {
    assert.deepEqual(typingIndicator({ messageId: INCOMING_WAMID }), await expectedStatus("03-typing-indicator.json", { incoming_wamid: INCOMING_WAMID }));
  });

  it("04 safetyMarkedFrame matches 04-safety-marked-frame.json (S1, S3)", async () => {
    assert.deepEqual(
      safetyMarkedFrame({ to: TO, markedFrameUrl: MARKED_FRAME_URL }),
      await expected("04-safety-marked-frame.json", { customer_wa_id: TO, marked_frame_url: MARKED_FRAME_URL }),
    );
  });

  it("05 locationRequest matches 05-location-request.json for plumbing with water off (S1, S3)", async () => {
    assert.deepEqual(
      locationRequest({ to: TO, category: "plumbing", waterOff: true }),
      await expected("05-location-request.json", { customer_wa_id: TO }),
    );
  });

  it("06 finding matches 06-finding.json for plumbing (S1, S3)", async () => {
    assert.deepEqual(finding({ to: TO, category: "plumbing" }), await expected("06-finding.json", { customer_wa_id: TO }));
  });

  it("14 offTopic matches 14-off-topic.json (S1, S3)", async () => {
    assert.deepEqual(offTopic({ to: TO }), await expected("14-off-topic.json", { customer_wa_id: TO }));
  });

  it("15 zukkiIsBack matches 15-zukki-is-back.json (S1, S3)", async () => {
    assert.deepEqual(
      zukkiIsBack({ to: TO, businessName: BUSINESS_NAME }),
      await expected("15-zukki-is-back.json", { customer_wa_id: TO, business_name: BUSINESS_NAME }),
    );
  });
});

// Builders return the message without the envelope: send() adds
// messaging_product and recipient_type (src/client.ts).
async function expected(file: string, values: Record<string, string>): Promise<unknown> {
  const { messaging_product: _product, recipient_type: _recipient, ...message } = await expectedStatus(file, values);
  return message;
}

// 03 is a status update that markRead posts as is, envelope included.
async function expectedStatus(file: string, values: Record<string, string>): Promise<Record<string, unknown>> {
  const url = new URL(`../../../handoff-ui/whatsapp/payloads/${file}`, import.meta.url);
  return JSON.parse(fillPlaceholders(await readFile(url, "utf8"), values));
}

function fillPlaceholders(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => {
    const value = values[name];
    assert.ok(value !== undefined, `demo value missing for {{${name}}}`);
    return value;
  });
}
