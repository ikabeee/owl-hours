import type { ISODate, Job } from "../../../shared/data/types.ts";

export type JobSegment = "tonight" | "upcoming" | "done";

const CALENDAR_DAY = /^(\d{4}-\d{2}-\d{2})/;

// A finished job sits in Done; otherwise it is Tonight, unless its visit is on a later calendar
// day than `now` (then it is Upcoming). Days are read from each timestamp's own offset, like
// wallClockTime, so a device in another zone segments the same jobs.
export function jobSegment(job: Job, now: ISODate): JobSegment {
  if (job.status === "done") return "done";

  const visitDay = job.scheduledFor ? CALENDAR_DAY.exec(job.scheduledFor)?.[1] : undefined;
  const today = CALENDAR_DAY.exec(now)?.[1];
  if (visitDay && today && visitDay > today) return "upcoming";

  return "tonight";
}

// The jobs of one segment, in the store's order.
export function jobsInSegment(jobs: Job[], segment: JobSegment, now: ISODate): Job[] {
  return jobs.filter((job) => jobSegment(job, now) === segment);
}
