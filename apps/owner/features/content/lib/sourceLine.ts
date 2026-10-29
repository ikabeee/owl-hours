// Pure function to determine the source line or draft subtitle from draft and optional job.
// No nested ternary; used by both useContent and usePostReview hooks.
import type { Job, PostDraft } from "../../../shared/data/types.ts";
import { contentCopys } from "../copys/contentCopys.ts";

export function sourceLine(draft: PostDraft, job?: Job | null): string {
  if (draft.source === "job") {
    if (job) {
      const firstName = job.customerName.trim().split(/\s+/)[0];
      return contentCopys.jobDraftSubtitle(firstName);
    }
    return contentCopys.sourceLine.job;
  }

  if (draft.source === "reminder") {
    return contentCopys.sourceLine.reminder;
  }

  if (draft.source === "prices") {
    return contentCopys.sourceLine.prices;
  }

  return contentCopys.madeFromJobsAndPrices;
}
