// Spec: docs/HANDOFF-OWNER-APP.md, T5.2 assignment, test group 1. The body mirrors the WhatsApp
// interactive message handoff-ui/whatsapp/payloads/13-quote.json:
//   "{{technician}} · arrives {{arrival_window}}\n\n<label>: <amount>\n...\n*Estimated total: {{total_range}}*\n\nYou pay {{first_name}} after the repair."
// The bubble draws the total bold, so the structured body holds the total WITHOUT asterisks, and the
// message `text` (the chat list preview) is the same body as plain lines.
// Both jobs (writes `text` when a quote is sent) and chats (draws the bubble) need it: it lives in shared/lib.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob } from "../data/mock.ts";
import type { Quote } from "../data/types.ts";
import { quoteMessageBody, quoteMessageText } from "./quoteMessage.ts";

const DEMO_BODY_LINES = [
  "Mario R. · arrives 12:55–1:25 AM",
  "",
  "Visit: $45",
  "Night fee: $25",
  "Fill valve repair: $60–90",
  "Estimated total: $130–160",
  "",
  "You pay Mario after the repair.",
];

describe("quoteMessageBody", () => {
  it("builds Ana's body part by part: arrival, one line per quote line, total, who she pays", () => {
    assert.deepEqual(quoteMessageBody(anaJob.quote), {
      arrivalLine: "Mario R. · arrives 12:55–1:25 AM",
      lines: ["Visit: $45", "Night fee: $25", "Fill valve repair: $60–90"],
      totalLine: "Estimated total: $130–160",
      payLine: "You pay Mario after the repair.",
    });
  });

  it("builds from the quote it is given: every line in order, the technician's first name, the window as written", () => {
    const quote: Quote = {
      lines: [
        { label: "Diagnosis", amount: 30 },
        { label: "Seal kit", amount: { min: 20, max: 35 } },
        { label: "Labor", amount: { min: 50, max: 50 } },
        { label: "Cleanup", amount: 15 },
      ],
      total: { min: 115, max: 130 },
      arrival: { from: "11:30 PM", to: "12:15 AM" },
      technician: "Lucía R.",
    };

    assert.deepEqual(quoteMessageBody(quote), {
      arrivalLine: "Lucía R. · arrives 11:30 PM–12:15 AM",
      lines: ["Diagnosis: $30", "Seal kit: $20–35", "Labor: $50", "Cleanup: $15"],
      totalLine: "Estimated total: $115–130",
      payLine: "You pay Lucía after the repair.",
    });
  });
});

describe("quoteMessageText", () => {
  it("is Ana's body line by line, the total without asterisks", () => {
    assert.deepEqual(quoteMessageText(anaJob.quote).split("\n"), DEMO_BODY_LINES);
  });
});
