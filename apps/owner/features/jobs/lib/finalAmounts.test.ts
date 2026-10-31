// Spec: docs/HANDOFF-OWNER-APP.md, T5.1 assignment, test file 1 ("final total from final amounts
// ($45 + $25 + $75 = $145)"). The Finish form opens with the design's values: a single-amount line keeps
// its amount, a range line starts at the middle of its range ($60–90 -> $75). The rounding of an odd middle
// is an open question (Q6) and is not pinned.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob } from "../../../shared/data/mock.ts";
import { finalTotal, initialFinalAmounts } from "./finalAmounts.ts";

describe("initialFinalAmounts", () => {
  it("opens Ana's finish form with $45, $25 and $75, the design's values", () => {
    assert.deepEqual(initialFinalAmounts(anaJob.quote.lines), [45, 25, 75]);
  });

  it("keeps the amount of a single-amount line", () => {
    assert.deepEqual(initialFinalAmounts([{ label: "Visit", amount: 45 }]), [45]);
  });

  it("starts a range line at the middle of its range", () => {
    assert.deepEqual(initialFinalAmounts([{ label: "Repair", amount: { min: 100, max: 200 } }]), [150]);
  });
});

describe("finalTotal", () => {
  it("adds the final amounts: $45 + $25 + $75 = $145", () => {
    assert.equal(finalTotal([45, 25, 75]), 145);
  });

  it("recalculates when an amount changes", () => {
    assert.equal(finalTotal([45, 25, 90]), 160);
  });

  it("is 0 for no amounts", () => {
    assert.equal(finalTotal([]), 0);
  });
});
