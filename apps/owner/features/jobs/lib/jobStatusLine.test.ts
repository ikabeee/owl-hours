// Spec: docs/HANDOFF-OWNER-APP.md, T5.1 assignment, test file 1 ("status line"): success line with a check
// "Approved · arrive 12:55 AM"; secondary line "Waiting for Carlos to approve". The line for en_route,
// on_site and done is not pinned yet (open question Q4 in the RED report).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob } from "../../../shared/data/mock.ts";
import type { Job } from "../../../shared/data/types.ts";
import { jobStatusLine } from "./jobStatusLine.ts";

function jobWith(overrides: Partial<Job>): Job {
  return { ...anaJob, ...overrides };
}

describe("jobStatusLine", () => {
  it('is the success line "Approved · arrive 12:55 AM" for Ana\'s approved job', () => {
    assert.deepEqual(jobStatusLine(anaJob), { text: "Approved · arrive 12:55 AM", tone: "success" });
  });

  it("names the arrival the quote promised", () => {
    const lateArrival = { ...anaJob.quote, arrival: { from: "2:10 PM", to: "2:40 PM" } };

    assert.equal(jobStatusLine(jobWith({ quote: lateArrival })).text, "Approved · arrive 2:10 PM");
  });

  it('is the secondary line "Waiting for Carlos to approve" while his quote is out', () => {
    const carlos = jobWith({ customerName: "Carlos M.", status: "quoted" });

    assert.deepEqual(jobStatusLine(carlos), { text: "Waiting for Carlos to approve", tone: "secondary" });
  });

  it("uses the customer's first name only", () => {
    assert.equal(jobStatusLine(jobWith({ customerName: "Grace K.", status: "quoted" })).text, "Waiting for Grace to approve");
  });

  it("waits for the customer also when the owner confirmed but the customer has not approved", () => {
    assert.deepEqual(jobStatusLine(jobWith({ status: "owner_confirmed" })), { text: "Waiting for Ana to approve", tone: "secondary" });
  });
});
