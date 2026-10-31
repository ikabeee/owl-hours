import { liveOwnerApi } from "../../../lib/liveOwnerApi";
import type { ISODate } from "../../../shared/data/types.ts";
import { createLiveJobsClient } from "../services/jobsLive.ts";
import { createJobsService } from "../services/jobsService.ts";
import type { JobsService } from "../services/jobsService.ts";
import { sharedDemoJobsService, sharedDemoNow } from "./demoJobsService.ts";

let liveService: JobsService | null = null;

// What the jobs hooks use by default: the owner API in live mode, the shared demo store otherwise.
export function defaultJobsService(): JobsService {
  const api = liveOwnerApi();
  if (!api) return sharedDemoJobsService();
  if (!liveService) liveService = createJobsService(createLiveJobsClient(api));
  return liveService;
}

// The clock the jobs list segments with: the wall clock in live mode, the designs' night in the demo.
export function defaultJobsNow(): ISODate {
  return liveOwnerApi() ? new Date().toISOString() : sharedDemoNow();
}
