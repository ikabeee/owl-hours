import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  accepted,
  disclosure,
  finding,
  locationRequest,
  nextBusiness,
  offTopic,
  ownerMessageAsWritten,
  ownerMessagePolished,
  quote,
  requestSent,
  safetyMarkedFrame,
  suggestBusiness,
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
const NORTHSIDE_ID = "10000000-0000-4000-8000-000000000001";
const BUSINESS_NAME = "Northside Plumbing";
const SHORT_NAME = "Northside";
const QUOTE_ID = "90000000-0000-4000-8000-000000000001";
const AS_WRITTEN_TEXT = "ok mario there 12:55, bringing the valve. 45 visit + 25 night, repair 60-90";
const POLISHED_TEXT =
  "Hi Ana, Mario can be there at 12:55 AM and he's bringing a new fill valve. The visit is $45 plus a $25 night fee, and the repair should be $60–90.";

const northsideMatch = {
  businessId: NORTHSIDE_ID,
  businessName: BUSINESS_NAME,
  rating: 4.9,
  reviews: 128,
  distanceKm: 1.2,
  openNow: true,
  visit: 45,
  nightFee: { amount: 25, window: "10 PM-7 AM" },
  repairFrom: 60,
  repairLabel: "Leak repair",
  etaMinutes: 40,
  currency: "USD",
  takesNightJobs: true,
};

const demoQuote = {
  quoteId: QUOTE_ID,
  businessName: BUSINESS_NAME,
  technician: "Mario R.",
  arrivalWindow: "12:55–1:25 AM",
  lines: [
    { label: "Visit", min: 45, max: 45 },
    { label: "Night fee", min: 25, max: 25 },
    { label: "Fill valve repair", min: 60, max: 90 },
  ],
  totalMin: 130,
  totalMax: 160,
  currency: "USD",
};

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

  it("07 suggestBusiness matches 07-suggest-business.json with the demo match (S1, S3)", async () => {
    assert.deepEqual(
      suggestBusiness({ to: TO, category: "plumbing", match: northsideMatch }),
      await expected("07-suggest-business.json", {
        customer_wa_id: TO,
        business_id: NORTHSIDE_ID,
        business_name: BUSINESS_NAME,
        rating: "4.9",
        reviews: "128",
        distance_km: "1.2",
        visit_price: "$45",
        night_fee: "+$25",
        repair_from: "$60",
        eta_min: "40",
      }),
    );
  });

  it("08 requestSent matches 08-request-sent.json with a 5 minute window (S1, S3)", async () => {
    assert.deepEqual(
      requestSent({ to: TO, businessName: BUSINESS_NAME, acceptMinutes: 5 }),
      await expected("08-request-sent.json", { customer_wa_id: TO, business_name: BUSINESS_NAME, accept_minutes: "5" }),
    );
  });

  it("09 nextBusiness matches 09-next-business.json for an expiry (S1, S3)", async () => {
    assert.deepEqual(
      nextBusiness({ to: TO, businessName: BUSINESS_NAME, reason: "expired" }),
      await expected("09-next-business.json", { customer_wa_id: TO, business_name: BUSINESS_NAME }),
    );
  });

  it("10 accepted matches 10-accepted.json (S1, S3)", async () => {
    assert.deepEqual(
      accepted({ to: TO, businessName: BUSINESS_NAME }),
      await expected("10-accepted.json", { customer_wa_id: TO, business_name: BUSINESS_NAME }),
    );
  });

  it("11 ownerMessageAsWritten matches 11-owner-message-as-written.json (S1, S3)", async () => {
    assert.deepEqual(
      ownerMessageAsWritten({ to: TO, businessName: BUSINESS_NAME, senderFirstName: "Mario", ownerText: AS_WRITTEN_TEXT }),
      await expected("11-owner-message-as-written.json", {
        customer_wa_id: TO,
        business_name: BUSINESS_NAME,
        sender_first_name: "Mario",
        owner_text: AS_WRITTEN_TEXT,
      }),
    );
  });

  it("12 ownerMessagePolished matches 12-owner-message-polished.json (S1, S3)", async () => {
    assert.deepEqual(
      ownerMessagePolished({
        to: TO,
        businessName: BUSINESS_NAME,
        senderFirstName: "Mario",
        polishedText: POLISHED_TEXT,
        businessShortName: SHORT_NAME,
      }),
      await expected("12-owner-message-polished.json", {
        customer_wa_id: TO,
        business_name: BUSINESS_NAME,
        sender_first_name: "Mario",
        polished_text: POLISHED_TEXT,
        business_short_name: SHORT_NAME,
      }),
    );
  });

  it("13 quote matches 13-quote.json with the demo quote (S1, S3)", async () => {
    assert.deepEqual(
      quote({ to: TO, ...demoQuote }),
      await expected("13-quote.json", {
        customer_wa_id: TO,
        business_name: BUSINESS_NAME,
        technician: "Mario R.",
        arrival_window: "12:55–1:25 AM",
        visit_price: "$45",
        night_fee: "$25",
        repair_label: "Fill valve repair",
        repair_range: "$60–90",
        total_range: "$130–160",
        technician_first_name: "Mario",
        quote_id: QUOTE_ID,
      }),
    );
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
