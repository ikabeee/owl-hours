import type { JobStatus } from "../../../shared/data/types.ts";

const STATUSES_BEFORE_APPROVAL: JobStatus[] = ["quoted", "owner_confirmed"];

// The footer holds the status button; before the customer approves there is nothing to do yet.
export function isJobFooterVisible(status: JobStatus): boolean {
  return !STATUSES_BEFORE_APPROVAL.includes(status);
}
