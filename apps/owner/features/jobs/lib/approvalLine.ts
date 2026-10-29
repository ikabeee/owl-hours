import type { Job } from "../../../shared/data/types.ts";
import { firstName } from "../../../shared/lib/firstName.ts";
import { wallClockTimeText } from "../../../shared/lib/wallClockTime.ts";
import { jobsCopys } from "../copys/jobsCopys.ts";

// "Approved by Ana at 12:07 AM"; null while the customer has not approved or the time is unreadable.
export function approvalLine(job: Job): string | null {
  const time = job.approvedAt ? wallClockTimeText(job.approvedAt) : null;
  if (!time) return null;

  return `${jobsCopys.approvedBy} ${firstName(job.customerName)} ${jobsCopys.atTime} ${time}`;
}
