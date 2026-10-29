// Operator decision (T5, answer 9): jobs (quote and job detail) and chats (SuggestionRow
// "Zukki suggests sending the quote: $130–160") both write money ranges (two real callers).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { amountText, moneyRangeText } from "./moneyText.ts";

describe("moneyRangeText", () => {
  it("writes Ana's total as $130–160 with an en dash", () => {
    assert.equal(moneyRangeText({ min: 130, max: 160 }), "$130–160");
  });

  it("writes a range with equal ends as one amount: $45", () => {
    assert.equal(moneyRangeText({ min: 45, max: 45 }), "$45");
  });
});

describe("amountText", () => {
  it("writes a single amount as $45", () => {
    assert.equal(amountText(45), "$45");
  });

  it("writes a range as $60–90", () => {
    assert.equal(amountText({ min: 60, max: 90 }), "$60–90");
  });
});
