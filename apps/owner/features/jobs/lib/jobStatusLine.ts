import type { Job, JobStatus } from "../../../shared/data/types.ts";
import { firstName } from "../../../shared/lib/firstName.ts";
import { moneyRangeText } from "../../../shared/lib/moneyText.ts";
import { jobsCopys } from "../copys/jobsCopys.ts";

export type JobStatusTone = "success" | "secondary";

export type JobStatusLine = { text: string; tone: JobStatusTone };

const STATUSES_BEFORE_APPROVAL: JobStatus[] = ["quoted", "owner_confirmed"];

// The line under a job card: the approval and arrival once approved, a waiting line before that,
// the trip milestones while under way, and the final total once done.
export function jobStatusLine(job: Job): JobStatusLine {
  if (STATUSES_BEFORE_APPROVAL.includes(job.status)) {
    return { text: jobsCopys.waitingForApproval(firstName(job.customerName)), tone: "secondary" };
  }
  if (job.status === "en_route") return { text: jobsCopys.onTheWay, tone: "success" };
  if (job.status === "on_site") return { text: jobsCopys.onSite, tone: "success" };
  if (job.status === "done") {
    const total = job.finalTotal !== undefined ? `$${job.finalTotal}` : moneyRangeText(job.quote.total);
    return { text: `${jobsCopys.timelineDone} · ${total}`, tone: "success" };
  }

  return { text: jobsCopys.approvedArrive(job.quote.arrival.from), tone: "success" };
}
