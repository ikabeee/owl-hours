// Spec: odd/tasks/owner-content.md, S4 requirement.
// Pure functions for post approval logic: target validation, scheduling vs publishing,
// draft status guards, and immutability.
import type { PostDraft, PostStatus } from "../../../shared/data/types.ts";

export type ApprovePostOptions = {
  now: string;
  caption?: string | undefined;
  targets?: { facebook: boolean; instagram: boolean } | undefined;
};

export function canApprovePost(targets: { facebook: boolean; instagram: boolean }): boolean {
  return Boolean(targets.facebook || targets.instagram);
}

export function approvePost(draft: PostDraft, options: ApprovePostOptions): PostDraft | null {
  if (draft.status !== "draft") {
    return null;
  }

  const targets = options.targets ?? draft.targets;
  if (!canApprovePost(targets)) {
    return null;
  }

  const caption = options.caption ?? draft.caption;
  const scheduledTime = draft.scheduledFor ? Date.parse(draft.scheduledFor) : NaN;
  const isFutureScheduled =
    !Number.isNaN(scheduledTime) && scheduledTime > Date.parse(options.now);

  const status: PostStatus = isFutureScheduled ? "scheduled" : "published";

  const result: PostDraft = {
    ...structuredClone(draft),
    status,
    caption,
    targets: structuredClone(targets),
  };

  if (!isFutureScheduled) {
    result.publishedAt = options.now;
  } else {
    delete result.publishedAt;
  }

  return result;
}

export function regeneratePost(draft: PostDraft): PostDraft | null {
  if (draft.status !== "draft") {
    return null;
  }

  return structuredClone(draft);
}
