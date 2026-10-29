// Spec: operator answer 8 (T5): the design's grey rows "On the way" and "Done" are not stored in
// job.timeline; a pure function derives the ones still ahead from the job status.
// Statuses before approval (quoted, owner_confirmed) have no timeline screen and are not pinned.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pendingTimelineSteps } from "./pendingTimelineSteps.ts";

describe("pendingTimelineSteps", () => {
  it("at customer_approved both steps are ahead", () => {
    assert.deepEqual(pendingTimelineSteps("customer_approved"), ["On the way", "Done"]);
  });

  it("at en_route only Done is ahead", () => {
    assert.deepEqual(pendingTimelineSteps("en_route"), ["Done"]);
  });

  it("at on_site only Done is ahead", () => {
    assert.deepEqual(pendingTimelineSteps("on_site"), ["Done"]);
  });

  it("at done nothing is ahead", () => {
    assert.deepEqual(pendingTimelineSteps("done"), []);
  });
});
