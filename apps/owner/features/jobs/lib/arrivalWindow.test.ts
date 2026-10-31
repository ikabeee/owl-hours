// Spec: docs/HANDOFF-OWNER-APP.md, T5 assignment: MetadataList "Arrival 12:55–1:25 AM" (quote and job).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob } from "../../../shared/data/mock.ts";
import { arrivalWindowText } from "./arrivalWindow.ts";

describe("arrivalWindowText", () => {
  it("writes Ana's window as 12:55–1:25 AM, the period once", () => {
    assert.equal(arrivalWindowText(anaJob.quote.arrival), "12:55–1:25 AM");
  });

  it("keeps both periods when the window crosses midnight", () => {
    assert.equal(arrivalWindowText({ from: "11:30 PM", to: "12:15 AM" }), "11:30 PM–12:15 AM");
  });
});
