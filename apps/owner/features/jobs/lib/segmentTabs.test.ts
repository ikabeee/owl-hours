// Spec: docs/HANDOFF-OWNER-APP.md, T5.1 assignment, test file 1 ("segment counts"): the control reads
// "Tonight · 2" / "Upcoming · 3" / "Done". The counts are derived from the jobs, never hard-coded;
// Done carries no count.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob } from "../../../shared/data/mock.ts";
import type { Job } from "../../../shared/data/types.ts";
import { segmentTabs } from "./segmentTabs.ts";

const NOW = "2026-10-28T00:07:00-05:00";

function jobWith(overrides: Partial<Job>): Job {
  return { ...anaJob, ...overrides };
}

const tonightJob = jobWith({});
const upcomingJob = jobWith({ scheduledFor: "2026-10-29T10:00:00-05:00" });
const doneJob = jobWith({ status: "done" });

describe("segmentTabs", () => {
  it('reads "Tonight · 2", "Upcoming · 3" and "Done" for two, three and one jobs', () => {
    const jobs = [tonightJob, tonightJob, upcomingJob, upcomingJob, upcomingJob, doneJob];

    assert.deepEqual(segmentTabs(jobs, NOW), [
      { segment: "tonight", label: "Tonight · 2" },
      { segment: "upcoming", label: "Upcoming · 3" },
      { segment: "done", label: "Done" },
    ]);
  });

  it("derives the counts from the jobs: one more Tonight job reads Tonight · 3", () => {
    const tabs = segmentTabs([tonightJob, tonightJob, tonightJob], NOW);

    assert.equal(tabs[0]?.label, "Tonight · 3");
  });

  it("moves a finished job out of Tonight and leaves the Done label without a count", () => {
    const tabs = segmentTabs([tonightJob, doneJob], NOW);

    assert.equal(tabs[0]?.label, "Tonight · 1");
    assert.equal(tabs[2]?.label, "Done");
  });
});
