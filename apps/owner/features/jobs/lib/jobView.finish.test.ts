// Spec: docs/HANDOFF-OWNER-APP.md, T5.1 assignment, Job detail bullet. The serializable job view tells the
// DOM screen whether the footer button finishes the job (opens job/[id]/finish) instead of advancing it.
// SUPERSEDES nothing in jobView.test.ts, which only pins customer_approved and quoted.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob } from "../../../shared/data/mock.ts";
import type { JobStatus } from "../../../shared/data/types.ts";
import { buildJobView } from "./jobView.ts";

function viewAt(status: JobStatus) {
  return buildJobView({ ...anaJob, status });
}

describe("buildJobView at on_site", () => {
  const view = viewAt("on_site");

  it('offers an enabled "Finish" in a visible footer', () => {
    assert.deepEqual(view.action, { label: "Finish", nextStatus: null, isDisabled: false });
    assert.equal(view.isFooterVisible, true);
  });

  it("says the button finishes the job", () => {
    assert.equal(view.canFinish, true);
  });
});

describe("buildJobView at done", () => {
  it("keeps the footer visible with a disabled button that cannot finish again", () => {
    const view = viewAt("done");

    assert.equal(view.isFooterVisible, true);
    assert.equal(view.action.isDisabled, true);
    assert.equal(view.canFinish, false);
  });
});

describe("buildJobView before arriving", () => {
  for (const status of ["customer_approved", "en_route"] as const) {
    it(`at ${status} the button advances the trip instead of finishing`, () => {
      assert.equal(viewAt(status).canFinish, false);
    });
  }
});
