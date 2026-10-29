// L32 follow-up 4: "Sent by Zukki · 12:05 AM" reads the time Zukki recorded, not the device's zone.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sentTimeText } from "./sentTimeText.ts";

describe("sentTimeText", () => {
  it("writes Ana's request time as 12:05 AM", () => {
    assert.equal(sentTimeText("2026-10-28T00:05:00-05:00"), "12:05 AM");
  });

  it("writes an afternoon time with PM", () => {
    assert.equal(sentTimeText("2026-10-27T13:40:00-05:00"), "1:40 PM");
  });

  it("writes noon as 12:00 PM", () => {
    assert.equal(sentTimeText("2026-10-27T12:00:00Z"), "12:00 PM");
  });

  it("is null for a malformed timestamp, so no Invalid Date is shown", () => {
    assert.equal(sentTimeText("not-a-date"), null);
  });
});
