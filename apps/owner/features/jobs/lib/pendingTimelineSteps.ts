import type { JobStatus } from "../../../shared/data/types.ts";
import { jobsCopys } from "../copys/jobsCopys.ts";

const ON_THE_WAY = jobsCopys.onTheWay;
const DONE = jobsCopys.timelineDone;

const PENDING_BY_STATUS: Record<JobStatus, string[]> = {
  quoted: [ON_THE_WAY, DONE],
  owner_confirmed: [ON_THE_WAY, DONE],
  customer_approved: [ON_THE_WAY, DONE],
  en_route: [DONE],
  on_site: [DONE],
  done: [],
};

// The grey timeline rows still ahead of the job; job.timeline holds only what already happened.
export function pendingTimelineSteps(status: JobStatus): string[] {
  return PENDING_BY_STATUS[status];
}
