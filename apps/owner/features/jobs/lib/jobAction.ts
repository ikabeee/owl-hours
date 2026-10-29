import type { JobStatus } from "../../../shared/data/types.ts";
import { jobsCopys } from "../copys/jobsCopys.ts";

export type JobAction = { label: string; nextStatus: JobStatus | null; isDisabled: boolean };

const START_TRIP: JobAction = { label: jobsCopys.startTrip, nextStatus: "en_route", isDisabled: false };
const IM_HERE: JobAction = { label: jobsCopys.imHere, nextStatus: "on_site", isDisabled: false };
// Finishing the job is T5.1: until then the button is shown but cannot be pressed.
const FINISH_LATER: JobAction = { label: jobsCopys.finish, nextStatus: null, isDisabled: true };

const ACTION_BY_STATUS: Record<JobStatus, JobAction> = {
  quoted: { ...START_TRIP, nextStatus: null, isDisabled: true }, // the footer is hidden before approval
  owner_confirmed: { ...START_TRIP, nextStatus: null, isDisabled: true },
  customer_approved: START_TRIP,
  en_route: IM_HERE,
  on_site: FINISH_LATER,
  done: FINISH_LATER,
};

// The primary footer button follows the job status.
export function primaryAction(status: JobStatus): JobAction {
  return ACTION_BY_STATUS[status];
}
