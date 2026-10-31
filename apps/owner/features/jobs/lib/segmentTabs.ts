import type { ISODate, Job } from "../../../shared/data/types.ts";
import { jobsCopys } from "../copys/jobsCopys.ts";
import { jobsInSegment } from "./jobSegment.ts";
import type { JobSegment } from "./jobSegment.ts";

export type SegmentTab = { segment: JobSegment; label: string };

// The control labels, with the job counts derived from the jobs, never hard-coded. Done carries
// no count, like the design.
export function segmentTabs(jobs: Job[], now: ISODate): SegmentTab[] {
  return [
    { segment: "tonight", label: `${jobsCopys.tonight} · ${jobsInSegment(jobs, "tonight", now).length}` },
    { segment: "upcoming", label: `${jobsCopys.upcoming} · ${jobsInSegment(jobs, "upcoming", now).length}` },
    { segment: "done", label: jobsCopys.done },
  ];
}
