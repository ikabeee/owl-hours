// Spec: docs/HANDOFF-OWNER-APP.md, T5.1 assignment, test file 1 ("final line validation") and the Finish
// bullet: "Mark as done" needs every final amount to be a positive whole number and, when the total falls
// outside the estimate, a reason. Reuses the quote rules (lineValidation) for the amounts.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canMarkAsDone } from "./finishValidation.ts";

const ESTIMATE = { min: 130, max: 160 };

function inputWith(overrides: Partial<Parameters<typeof canMarkAsDone>[0]>) {
  return { amounts: [45, 25, 75], estimate: ESTIMATE, reason: "", ...overrides };
}

describe("canMarkAsDone with a total inside the estimate", () => {
  it("is true without a reason: Ana's $45 + $25 + $75", () => {
    assert.equal(canMarkAsDone(inputWith({})), true);
  });

  it("is true at both bounds of the estimate", () => {
    assert.equal(canMarkAsDone(inputWith({ amounts: [45, 25, 60] })), true); // $130
    assert.equal(canMarkAsDone(inputWith({ amounts: [45, 25, 90] })), true); // $160
  });
});

describe("canMarkAsDone with an invalid amount", () => {
  const invalidAmounts = [
    { why: "zero", amounts: [45, 0, 75] },
    { why: "negative", amounts: [45, -25, 75] },
    { why: "not a whole number", amounts: [45, 25, 75.5] },
    { why: "not a number", amounts: [45, 25, Number.NaN] },
    { why: "an empty form", amounts: [] },
  ];

  for (const { why, amounts } of invalidAmounts) {
    it(`is false for ${why}, even with a reason`, () => {
      assert.equal(canMarkAsDone(inputWith({ amounts, reason: "Extra parts" })), false);
    });
  }
});

describe("canMarkAsDone with a total outside the estimate", () => {
  const outside = [
    { why: "above ($170)", amounts: [45, 25, 100] },
    { why: "below ($100)", amounts: [45, 25, 30] },
  ];

  for (const { why, amounts } of outside) {
    it(`is false without a reason, ${why}`, () => {
      assert.equal(canMarkAsDone(inputWith({ amounts })), false);
    });

    it(`is false when the reason is only spaces, ${why}`, () => {
      assert.equal(canMarkAsDone(inputWith({ amounts, reason: "   " })), false);
    });

    it(`is true once a reason is given, ${why}`, () => {
      assert.equal(canMarkAsDone(inputWith({ amounts, reason: "Needed a new flapper too" })), true);
    });
  }
});
