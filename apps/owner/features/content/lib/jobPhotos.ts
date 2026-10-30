// Spec: odd/tasks/owner-content.md, S3 requirement.
// Resolves job photos and consent line for post review: appears only when shareConsent is "yes",
// extracts the customer's first name, and yields null otherwise.
import type { Job, PostDraft } from "../../../shared/data/types.ts";
import { contentCopys } from "../copys/contentCopys.ts";

export type ResolvedJobPhotos = {
  photos: {
    before?: string;
    after?: string;
    extra: string[];
  };
  consentLine: string;
};

export function resolveJobPhotos(
  draft: PostDraft,
  job?: Job | null,
): ResolvedJobPhotos | null {
  if (!job) {
    return null;
  }

  if (!draft.sourceJobId || draft.sourceJobId !== job.id) {
    return null;
  }

  if (job.shareConsent !== "yes") {
    return null;
  }

  const firstName = job.customerName.trim().split(/\s+/)[0];
  const consentLine = contentCopys.photoConsentLine(firstName);

  return {
    photos: structuredClone(job.photos),
    consentLine,
  };
}
