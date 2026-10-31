// Spec: docs/HANDOFF-OWNER-APP.md, T5 assignment, test file 1 (quote totals).
// Same invariant as packages/shared/src/schemas.ts quoteSchema: total min = sum of line minimums,
// total max = sum of line maximums. A single-amount line counts as min = max.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob } from "../../../shared/data/mock.ts";
import type { QuoteLine } from "../../../shared/data/types.ts";
import { quoteTotal } from "./quoteTotal.ts";

const demoLines = anaJob.quote.lines;

function withLine(index: number, line: QuoteLine): QuoteLine[] {
  return demoLines.map((demoLine, position) => (position === index ? line : demoLine));
}

describe("quoteTotal", () => {
  it("adds Ana's lines to $130–160: 45 + 25 + 60–90", () => {
    assert.deepEqual(quoteTotal(demoLines), { min: 130, max: 160 });
  });

  it("counts a single-amount line as both its minimum and its maximum", () => {
    assert.deepEqual(quoteTotal([{ label: "Visit", amount: 45 }]), { min: 45, max: 45 });
  });

  it("recalculates when a single-amount line changes: Visit 45 -> 50 gives $135–165", () => {
    assert.deepEqual(quoteTotal(withLine(0, { label: "Visit", amount: 50 })), { min: 135, max: 165 });
  });

  it("recalculates when a range line changes: repair 60–90 -> 70–120 gives $140–190", () => {
    const repair = { label: "Fill valve repair", amount: { min: 70, max: 120 } };

    assert.deepEqual(quoteTotal(withLine(2, repair)), { min: 140, max: 190 });
  });
});
