import { anaJob } from "../../../shared/data/mock.ts";
import type { ID, ISODate, Job, JobStatus, Quote } from "../../../shared/data/types.ts";
import { jobsCopys } from "../copys/jobsCopys.ts";
import { primaryAction } from "../lib/jobAction.ts";
import { canSendQuote } from "../lib/lineValidation.ts";
import { quoteTotal } from "../lib/quoteTotal.ts";

export type JobsClient = {
  findJobByConversationId(conversationId: ID): Promise<Job | null>;
  findJob(id: ID): Promise<Job | null>;
  saveJob(job: Job): Promise<void>;
};

// What the quote modal opens with: Zukki's pre-filled quote and who it is for.
export type QuoteDraft = { jobId: ID; title: string; customerName: string; quote: Quote };

export type JobsDeps = { now: () => ISODate };

// Refusals answer null: an unknown id, an invalid quote, or a status the job cannot move to.
export type JobsService = {
  getQuoteDraft(conversationId: ID): Promise<QuoteDraft | null>;
  sendQuote(conversationId: ID, quote: Quote): Promise<Job | null>;
  getJob(id: ID): Promise<Job | null>;
  updateJobStatus(id: ID, status: JobStatus): Promise<Job | null>;
};

export function createJobsService(client: JobsClient, deps: Partial<JobsDeps> = {}): JobsService {
  const { now } = { ...createDefaultDeps(), ...deps };

  return {
    getQuoteDraft: async (conversationId) => {
      const job = await client.findJobByConversationId(conversationId);
      return job && { jobId: job.id, title: job.title, customerName: job.customerName, quote: job.quote };
    },

    sendQuote: async (conversationId, quote) => {
      const job = await client.findJobByConversationId(conversationId);
      if (!job || !isConsistentQuote(quote)) return null;

      return save(client, { ...job, quote, status: "quoted" });
    },

    getJob: (id) => client.findJob(id),

    updateJobStatus: async (id, status) => {
      const job = await client.findJob(id);
      if (!job || primaryAction(job.status).nextStatus !== status) return null;

      return save(client, { ...job, status, timeline: [...job.timeline, ...eventsOnReaching(status, now())] });
    },
  };
}

// A quote is sendable when every line is valid and the total is the sum of the lines.
function isConsistentQuote(quote: Quote): boolean {
  const total = quoteTotal(quote.lines);
  return canSendQuote(quote.lines) && quote.total.min === total.min && quote.total.max === total.max;
}

// Only starting the trip is a milestone the timeline records; arriving on site is not.
function eventsOnReaching(status: JobStatus, at: ISODate): Job["timeline"] {
  return status === "en_route" ? [{ at, text: jobsCopys.onTheWay }] : [];
}

async function save(client: JobsClient, job: Job): Promise<Job> {
  await client.saveJob(job);
  return job;
}

// Plain in-memory store, seeded with private copies of the jobs; it never approves anything.
export function createInMemoryJobsClient(seedJobs: Job[]): JobsClient {
  const jobsById = new Map(structuredClone(seedJobs).map((job) => [job.id, job]));

  return {
    findJobByConversationId: async (conversationId) =>
      structuredClone([...jobsById.values()].find((job) => job.conversationId === conversationId) ?? null),
    findJob: async (id) => structuredClone(jobsById.get(id) ?? null),
    saveJob: async (job) => {
      jobsById.set(job.id, structuredClone(job));
    },
  };
}

const QUOTE_APPROVED_TEXT = "Quote sent and approved";

// The demo client plays the customer: it approves every quote that is sent, at `now()`.
export type FakeJobsClientDeps = { now: () => ISODate };

export function createFakeJobsClient(deps: Partial<FakeJobsClientDeps> = {}): JobsClient {
  const { now } = { ...createDefaultDeps(), ...deps };
  const store = createInMemoryJobsClient([anaJob]);

  return {
    ...store,
    saveJob: (job) => store.saveJob(job.status === "quoted" ? approvedOnCustomersBehalf(job, now()) : job),
  };
}

// Approving again replaces the earlier approval entry, so the timeline never repeats it.
function approvedOnCustomersBehalf(job: Job, at: ISODate): Job {
  const timelineWithoutApproval = job.timeline.filter((event) => event.text !== QUOTE_APPROVED_TEXT);
  return {
    ...job,
    status: "customer_approved",
    approvedAt: at,
    timeline: [...timelineWithoutApproval, { at, text: QUOTE_APPROVED_TEXT }],
  };
}

// Wall clock; the demo hooks inject a clock that starts at the designs' "12:05 AM".
function createDefaultDeps(): JobsDeps {
  return { now: () => new Date().toISOString() };
}
