// Spec: docs/HANDOFF-OWNER-APP.md, T5.1 assignment, test file 1 ("segment of a job").
// A job sits in Done once finished; otherwise it is Tonight, unless its visit is on a later calendar day
// than `now` (then it is Upcoming). Dates are read from each timestamp's own offset, like wallClockTime.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob } from "../../../shared/data/mock.ts";
import type { Job, JobStatus } from "../../../shared/data/types.ts";
import { jobSegment, jobsInSegment } from "./jobSegment.ts";

const NOW = "2026-10-28T00:07:00-05:00";
const TOMORROW_AT_TEN = "2026-10-29T10:00:00-05:00";

function jobWith(overrides: Partial<Job>): Job {
  return { ...anaJob, ...overrides };
}

describe("jobSegment", () => {
  it("puts a finished job in Done, even when it carries a visit time on a later day", () => {
    assert.equal(jobSegment(jobWith({ status: "done", scheduledFor: TOMORROW_AT_TEN }), NOW), "done");
  });

  const unfinishedStatuses: JobStatus[] = ["quoted", "owner_confirmed", "customer_approved", "en_route", "on_site"];
  for (const status of unfinishedStatuses) {
    it(`puts a ${status} job with no visit time Tonight`, () => {
      const { scheduledFor: _scheduledFor, ...jobWithoutVisitTime } = jobWith({ status });

      assert.equal(jobSegment(jobWithoutVisitTime, NOW), "tonight");
    });
  }

  it("puts a job whose visit is later the same calendar day Tonight", () => {
    assert.equal(jobSegment(jobWith({ scheduledFor: "2026-10-28T22:00:00-05:00" }), NOW), "tonight");
  });

  for (const status of ["customer_approved", "quoted"] as const) {
    it(`puts a ${status} job whose visit is on a later calendar day in Upcoming`, () => {
      assert.equal(jobSegment(jobWith({ status, scheduledFor: TOMORROW_AT_TEN }), NOW), "upcoming");
    });
  }

  it("compares calendar dates as written in each timestamp's own offset", () => {
    const lateTonight = "2026-10-28T23:30:00-05:00";
    const justAfterMidnight = "2026-10-29T00:30:00-05:00";

    assert.equal(jobSegment(jobWith({ scheduledFor: justAfterMidnight }), lateTonight), "upcoming");
  });
});

describe("jobsInSegment", () => {
  const ana = anaJob;
  const carlos = jobWith({ id: "job_carlos", status: "quoted" });
  const lucia = jobWith({ id: "job_lucia", scheduledFor: TOMORROW_AT_TEN });
  const grace = jobWith({ id: "job_grace", scheduledFor: "2026-10-29T14:30:00-05:00" });
  const finished = jobWith({ id: "job_finished", status: "done" });
  const jobs = [ana, carlos, lucia, grace, finished];

  it("keeps the jobs of the segment in their original order", () => {
    const ids = (segment: "tonight" | "upcoming" | "done") => jobsInSegment(jobs, segment, NOW).map((job) => job.id);

    assert.deepEqual(ids("tonight"), ["job_ana", "job_carlos"]);
    assert.deepEqual(ids("upcoming"), ["job_lucia", "job_grace"]);
    assert.deepEqual(ids("done"), ["job_finished"]);
  });

  it("is empty for a segment with no jobs", () => {
    assert.deepEqual(jobsInSegment([ana], "done", NOW), []);
  });
});
