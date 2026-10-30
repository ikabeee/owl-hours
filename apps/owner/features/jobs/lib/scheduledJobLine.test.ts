// Spec: docs/HANDOFF-OWNER-APP.md, T5.1 assignment, test file 1 ("Tomorrow line"): the "Tomorrow" card
// lists "10:00 AM · Water heater install · Lucía R." and "2:30 PM · Shower valve check · Grace K.".
// The visit time is the job's `scheduledFor`, written as wall-clock time in its own offset.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob } from "../../../shared/data/mock.ts";
import type { Job } from "../../../shared/data/types.ts";
import { scheduledJobLine } from "./scheduledJobLine.ts";

function jobWith(overrides: Partial<Job>): Job {
  return { ...anaJob, ...overrides };
}

describe("scheduledJobLine", () => {
  it('reads "10:00 AM · Water heater install · Lucía R."', () => {
    const lucia = jobWith({ title: "Water heater install", customerName: "Lucía R.", scheduledFor: "2026-10-29T10:00:00-05:00" });

    assert.equal(scheduledJobLine(lucia), "10:00 AM · Water heater install · Lucía R.");
  });

  it('reads "2:30 PM · Shower valve check · Grace K."', () => {
    const grace = jobWith({ title: "Shower valve check", customerName: "Grace K.", scheduledFor: "2026-10-29T14:30:00-05:00" });

    assert.equal(scheduledJobLine(grace), "2:30 PM · Shower valve check · Grace K.");
  });

  it("is null for a job with no visit time", () => {
    const { scheduledFor: _scheduledFor, ...jobWithoutVisitTime } = anaJob;

    assert.equal(scheduledJobLine(jobWithoutVisitTime), null);
  });

  it("is null for a malformed visit time", () => {
    assert.equal(scheduledJobLine(jobWith({ scheduledFor: "tomorrow-ish" })), null);
  });
});
