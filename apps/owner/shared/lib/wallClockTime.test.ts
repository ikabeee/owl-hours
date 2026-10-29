// Operator decision (T5, answer 9): times are wall-clock in the timestamp's own offset (D7/L33).
// Extracted from features/requests/lib/sentTimeText.ts because jobs needs it too (two real callers).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { wallClockTimeText } from "./wallClockTime.ts";

describe("wallClockTimeText", () => {
  it("writes the first timeline entry as 12:04 AM", () => {
    assert.equal(wallClockTimeText("2026-10-28T00:04:00-05:00"), "12:04 AM");
  });

  it("writes an afternoon time with PM", () => {
    assert.equal(wallClockTimeText("2026-10-27T13:40:00-05:00"), "1:40 PM");
  });

  it("writes noon as 12:00 PM", () => {
    assert.equal(wallClockTimeText("2026-10-27T12:00:00Z"), "12:00 PM");
  });

  it("is null for a malformed timestamp", () => {
    assert.equal(wallClockTimeText("not-a-date"), null);
  });
});
