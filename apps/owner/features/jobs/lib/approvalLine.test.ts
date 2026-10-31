// Spec: docs/HANDOFF-OWNER-APP.md, T5 assignment: Job detail subtitle "Approved by Ana at 12:07 AM" (success).
// Operator answer 7: the time comes from Job.approvedAt, not from the timeline text.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob } from "../../../shared/data/mock.ts";
import { approvalLine } from "./approvalLine.ts";

describe("approvalLine", () => {
  it('reads "Approved by Ana at 12:07 AM" for Ana\'s approved job', () => {
    assert.equal(approvalLine(anaJob), "Approved by Ana at 12:07 AM");
  });

  it("is null while the customer has not approved: no approvedAt", () => {
    const { approvedAt: _approvedAt, ...unapprovedFields } = anaJob;

    assert.equal(approvalLine({ ...unapprovedFields, status: "quoted" }), null);
  });
});
