// New tests (not part of the locked T5 set): the quote modal edits the lines it was opened with and sends
// a Quote built from them. Pure helpers, so the DOM screen and the hook hold no arithmetic.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob } from "../../../shared/data/mock.ts";
import { buildQuote, withLineAmount } from "./quoteEditing.ts";

const demoLines = anaJob.quote.lines;

describe("withLineAmount", () => {
  it("replaces the amount of one line and keeps its label and the other lines", () => {
    const edited = withLineAmount(demoLines, 1, 30);

    assert.deepEqual(edited, [
      { label: "Visit", amount: 45 },
      { label: "Night fee", amount: 30 },
      { label: "Fill valve repair", amount: { min: 60, max: 90 } },
    ]);
  });

  it("does not change the lines it was given", () => {
    const before = structuredClone(demoLines);

    withLineAmount(demoLines, 0, 99);

    assert.deepEqual(demoLines, before);
  });
});

describe("buildQuote", () => {
  it("recomputes the total from the edited lines and keeps arrival, technician and note", () => {
    const quote = buildQuote(anaJob.quote, withLineAmount(demoLines, 1, 30));

    assert.deepEqual(quote.total, { min: 135, max: 165 });
    assert.deepEqual(quote.arrival, anaJob.quote.arrival);
    assert.equal(quote.technician, "Mario R.");
    assert.equal(quote.note, "Excludes floor damage");
  });
});
