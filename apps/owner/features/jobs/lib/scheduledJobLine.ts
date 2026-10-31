import type { Job } from "../../../shared/data/types.ts";
import { wallClockTimeText } from "../../../shared/lib/wallClockTime.ts";

// "10:00 AM · Water heater install · Lucía R.": the visit time is the job's scheduledFor,
// written as wall-clock time in its own offset. Null when the job has no visit time.
export function scheduledJobLine(job: Job): string | null {
  const time = job.scheduledFor ? wallClockTimeText(job.scheduledFor) : null;
  if (!time) return null;

  return `${time} · ${job.title} · ${job.customerName}`;
}
