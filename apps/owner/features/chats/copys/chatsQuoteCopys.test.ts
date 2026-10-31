// Spec: docs/HANDOFF-OWNER-APP.md, T5.2 assignment, test group 4.
// Source: handoff-ui/whatsapp/payloads/13-quote.json (header, body wording, footer, reply buttons),
// quoted verbatim; no copy is invented for the quote bubble. The listed keys are every key the bubble renders.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { chatsCopys } from "./chatsCopys.ts";

const expectedQuoteCopys = {
  // header: "Quote from {{business_name}}"
  quoteFrom: "Quote from",
  // body: "{{technician}} · arrives {{arrival_window}}" ... "*Estimated total: ...*" ... "You pay {{first}} after the repair."
  arrives: "arrives",
  estimatedTotal: "Estimated total",
  youPay: "You pay",
  afterTheRepair: "after the repair.",
  // footer
  quoteFooter: "Nothing is booked until you approve",
  // the customer's reply buttons, drawn as non-interactive labels
  approveVisit: "Approve visit",
  askQuestion: "Ask a question",
};

describe("chatsCopys quote bubble", () => {
  for (const [key, text] of Object.entries(expectedQuoteCopys)) {
    it(`${key} is "${text}"`, () => {
      assert.equal(chatsCopys[key as keyof typeof chatsCopys], text);
    });
  }

  it("has every referenced key", () => {
    const missing = Object.keys(expectedQuoteCopys).filter((key) => !(key in chatsCopys));

    assert.deepEqual(missing, []);
  });

  it("has no empty string among the referenced keys", () => {
    for (const key of Object.keys(expectedQuoteCopys)) {
      const text = chatsCopys[key] ?? "";
      assert.notEqual(text.trim(), "", `${key} is empty`);
    }
  });
});
