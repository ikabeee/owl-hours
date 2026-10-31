import type { Job } from "../../../shared/data/types.ts";
import { arrivalWindowText } from "../../../shared/lib/arrivalWindow.ts";
import { firstName } from "../../../shared/lib/firstName.ts";
import { moneyRangeText } from "../../../shared/lib/moneyText.ts";
import { wallClockTimeText } from "../../../shared/lib/wallClockTime.ts";
import { visibleAddress } from "./addressVisibility.ts";
import { approvalLine } from "./approvalLine.ts";
import { canFinish } from "./finishAvailability.ts";
import { isJobFooterVisible } from "./jobFooter.ts";
import { primaryAction } from "./jobAction.ts";
import type { JobAction } from "./jobAction.ts";
import { pendingTimelineSteps } from "./pendingTimelineSteps.ts";

// Serializable by design: it crosses into the DOM component as props.
export type JobView = {
  title: string;
  customerName: string;
  customerFirstName: string;
  approvalLine: string | null;
  address: string | null; // null until the customer approved (location privacy)
  distanceKm: number | null;
  technician: string;
  quoteText: string;
  arrivalText: string;
  timeline: Array<{ timeText: string | null; text: string }>; // what already happened
  pendingSteps: string[]; // the grey rows still ahead
  action: JobAction;
  isFooterVisible: boolean;
  canFinish: boolean; // true only on site: the footer button opens job/[id]/finish instead of advancing
};

export function buildJobView(job: Job): JobView {
  return {
    title: job.title,
    customerName: job.customerName,
    customerFirstName: firstName(job.customerName),
    approvalLine: approvalLine(job),
    address: visibleAddress(job),
    distanceKm: job.distanceKm ?? null,
    technician: job.technician,
    quoteText: moneyRangeText(job.quote.total),
    arrivalText: arrivalWindowText(job.quote.arrival),
    timeline: job.timeline.map((event) => ({ timeText: wallClockTimeText(event.at), text: event.text })),
    pendingSteps: pendingTimelineSteps(job.status),
    action: primaryAction(job.status),
    isFooterVisible: isJobFooterVisible(job.status),
    canFinish: canFinish(job.status),
  };
}
