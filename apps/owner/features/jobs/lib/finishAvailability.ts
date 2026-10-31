import type { JobStatus } from "../../../shared/data/types.ts";

// Finishing is possible only on site. The footer button and the service guard share this
// predicate, so a screen can never offer what the service would refuse.
export function canFinish(status: JobStatus): boolean {
  return status === "on_site";
}
