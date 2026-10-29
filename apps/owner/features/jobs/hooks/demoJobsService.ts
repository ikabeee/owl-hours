import { createDemoClock } from "../lib/demoClock.ts";
import { createFakeJobsClient, createJobsService } from "../services/jobsService.ts";
import type { JobsService } from "../services/jobsService.ts";

// OwQuote's status bar reads 12:07 AM, the seed's "Quote sent and approved" time. Starting the jobs
// clock there (not at the request's DEMO_NOW, 12:05) keeps every later timeline entry in order.
const QUOTE_DEMO_NOW = "2026-10-28T00:07:00-05:00";

// The default service of the jobs hooks until Supabase exists: a fake client that approves quotes on the
// customer's behalf, on a demo clock so times match the designs.
export function createDemoJobsService(): JobsService {
  const now = createDemoClock(QUOTE_DEMO_NOW);
  return createJobsService(createFakeJobsClient({ now }), { now });
}
