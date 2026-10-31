// Spec: docs/HANDOFF-OWNER-APP.md, T5.1 assignment, test file 1 ("estimate check (inside, below, above,
// at both bounds)"): "Within the $130–160 estimate" when min <= total <= max.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { estimateCheck } from "./estimateCheck.ts";

const ESTIMATE = { min: 130, max: 160 };

describe("estimateCheck against the $130–160 estimate", () => {
  const cases = [
    { total: 145, expected: "within", why: "inside" },
    { total: 130, expected: "within", why: "at the lower bound" },
    { total: 160, expected: "within", why: "at the upper bound" },
    { total: 129, expected: "below", why: "one under the lower bound" },
    { total: 161, expected: "above", why: "one over the upper bound" },
    { total: 0, expected: "below", why: "far under" },
    { total: 500, expected: "above", why: "far over" },
  ] as const;

  for (const { total, expected, why } of cases) {
    it(`$${total} is ${expected} (${why})`, () => {
      assert.equal(estimateCheck(total, ESTIMATE), expected);
    });
  }
});
