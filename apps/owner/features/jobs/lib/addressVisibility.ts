import type { Job, JobStatus } from "../../../shared/data/types.ts";

const STATUSES_WITH_ADDRESS: JobStatus[] = ["customer_approved", "en_route", "on_site", "done"];

// Location privacy (AGENTS.md): the street address exists for the owner only from customer_approved on.
export function isAddressVisible(status: JobStatus): boolean {
  return STATUSES_WITH_ADDRESS.includes(status);
}

export function visibleAddress(job: Job): string | null {
  return isAddressVisible(job.status) ? (job.address ?? null) : null;
}
