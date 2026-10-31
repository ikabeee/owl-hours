// Spec: docs/HANDOFF-OWNER-APP.md, T5.2 assignment, test group 1 and the operator decision that the
// message mirrors handoff-ui/whatsapp/payloads/13-quote.json: header "Quote from {{business_name}}",
// the body, footer "Nothing is booked until you approve", buttons "Approve visit" / "Ask a question".
// buildQuoteCard is the serializable shape the bubble draws (it crosses into the DOM screen as props).
// Names (open question Q4): buildQuoteCard(quote, businessName) -> QuoteCard.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob, business } from "../../../shared/data/mock.ts";
import type { Quote } from "../../../shared/data/types.ts";
import { buildQuoteCard } from "./quoteCard.ts";

describe("buildQuoteCard", () => {
  it("builds Ana's card: Northside's header, the body, the footer, and the two reply labels in order", () => {
    assert.deepEqual(buildQuoteCard(anaJob.quote, business.name), {
      header: "Quote from Northside Plumbing",
      arrivalLine: "Mario R. · arrives 12:55–1:25 AM",
      lines: ["Visit: $45", "Night fee: $25", "Fill valve repair: $60–90"],
      totalLine: "Estimated total: $130–160",
      payLine: "You pay Mario after the repair.",
      footer: "Nothing is booked until you approve",
      replyLabels: ["Approve visit", "Ask a question"],
    });
  });

  it("builds from the quote and the business it is given, not from the demo", () => {
    const quote: Quote = {
      lines: [{ label: "Drain snake", amount: { min: 80, max: 100 } }],
      total: { min: 80, max: 100 },
      arrival: { from: "10:00 AM", to: "10:30 AM" },
      technician: "Grace K.",
    };

    const card = buildQuoteCard(quote, "Eastside Drains");

    assert.equal(card.header, "Quote from Eastside Drains");
    assert.equal(card.arrivalLine, "Grace K. · arrives 10:00–10:30 AM");
    assert.deepEqual(card.lines, ["Drain snake: $80–100"]);
    assert.equal(card.totalLine, "Estimated total: $80–100");
    assert.equal(card.payLine, "You pay Grace after the repair.");
  });
});
