// Spec: docs/HANDOFF-OWNER-APP.md, T5 assignment, test file 1 (line validation).
// HANDOFF-RN-UI.md section 8 Quote: "Validation: min ≤ max, positive whole numbers."
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob } from "../../../shared/data/mock.ts";
import { canSendQuote, isValidAmount } from "./lineValidation.ts";

describe("isValidAmount accepts", () => {
  it("a positive whole number: 45", () => {
    assert.equal(isValidAmount(45), true);
  });

  it("a range whose min is below its max: 60–90", () => {
    assert.equal(isValidAmount({ min: 60, max: 90 }), true);
  });

  it("a range whose min equals its max: 60–60", () => {
    assert.equal(isValidAmount({ min: 60, max: 60 }), true);
  });
});

describe("isValidAmount refuses", () => {
  const invalidAmounts = [
    { why: "min above max", amount: { min: 90, max: 60 } },
    { why: "zero", amount: 0 },
    { why: "a zero minimum", amount: { min: 0, max: 50 } },
    { why: "a negative number", amount: -5 },
    { why: "a negative minimum", amount: { min: -5, max: 10 } },
    { why: "a non-integer", amount: 45.5 },
    { why: "a non-integer maximum", amount: { min: 60, max: 90.5 } },
    { why: "NaN (an emptied field)", amount: Number.NaN },
  ];

  for (const { why, amount } of invalidAmounts) {
    it(why, () => {
      assert.equal(isValidAmount(amount), false);
    });
  }
});

describe("canSendQuote", () => {
  it("is true for Ana's demo lines", () => {
    assert.equal(canSendQuote(anaJob.quote.lines), true);
  });

  it("is false as soon as one line is invalid", () => {
    const withBrokenLine = [...anaJob.quote.lines, { label: "Parts", amount: { min: 90, max: 60 } }];

    assert.equal(canSendQuote(withBrokenLine), false);
  });
});
