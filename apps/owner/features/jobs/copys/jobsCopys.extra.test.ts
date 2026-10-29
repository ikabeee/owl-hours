// New tests (not part of the locked T5 set): operator answer 6 (L36) and the error state of the quote modal
// (HANDOFF-RN-UI.md section 8, "Every screen also needs", Error).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { jobsCopys } from "./jobsCopys.ts";

describe("jobsCopys without a distance", () => {
  it('sharedAfterApproved("Ana") is "Shared after Ana approved"', () => {
    assert.equal(jobsCopys.sharedAfterApproved("Ana"), "Shared after Ana approved");
  });
});

describe("jobsCopys error state", () => {
  it('somethingWentWrong is "Something went wrong."', () => {
    assert.equal(jobsCopys.somethingWentWrong, "Something went wrong.");
  });
});
