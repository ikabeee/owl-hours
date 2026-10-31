// Spec: docs/HANDOFF-OWNER-APP.md, T5.1 assignment, Job detail bullet: at on_site the footer's "Finish"
// is enabled (and opens job/[id]/finish, so it leads to no status); at done it is disabled.
// SUPERSEDES jobAction.test.ts "at on_site reads "Finish", disabled until T5.1": that assertion expects
// isDisabled: true. The other statuses keep their behavior, pinned in jobAction.test.ts.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { primaryAction } from "./jobAction.ts";

describe("primaryAction once finishing exists", () => {
  it('at on_site is an enabled "Finish" that leads to no status (it opens the finish screen)', () => {
    assert.deepEqual(primaryAction("on_site"), { label: "Finish", nextStatus: null, isDisabled: false });
  });

  it("at done is disabled and leads nowhere", () => {
    const action = primaryAction("done");

    assert.equal(action.isDisabled, true);
    assert.equal(action.nextStatus, null);
  });

  it("still starts the trip and arrives as before", () => {
    assert.equal(primaryAction("customer_approved").nextStatus, "en_route");
    assert.equal(primaryAction("en_route").nextStatus, "on_site");
  });
});
