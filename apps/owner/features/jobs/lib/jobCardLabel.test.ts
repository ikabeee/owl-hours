import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { jobCardLabel } from "./jobCardLabel.ts";

describe("jobCardLabel", () => {
  it("joins the title, the subtitle and the status line", () => {
    assert.equal(
      jobCardLabel({
        title: "Leaking toilet",
        subtitle: "Ana L. · Mario R. · $130–160",
        statusText: "Approved · arrive 12:55 AM",
      }),
      "Leaking toilet, Ana L. · Mario R. · $130–160, Approved · arrive 12:55 AM",
    );
  });
});
