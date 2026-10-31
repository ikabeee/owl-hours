import { anaJob, carlosJob, graceJob, luciaJob } from "../../../shared/data/mock.ts";
import { createThreadStore } from "../../../shared/data/threadStore.ts";
import type { ThreadStore } from "../../../shared/data/threadStore.ts";
import type { ID, ISODate, Job, JobStatus, Message, Money, Quote } from "../../../shared/data/types.ts";
import { quoteMessageText } from "../../../shared/lib/quoteMessage.ts";
import { jobsCopys } from "../copys/jobsCopys.ts";
import { estimateCheck } from "../lib/estimateCheck.ts";
import { finalTotal } from "../lib/finalAmounts.ts";
import { canFinish } from "../lib/finishAvailability.ts";
import { primaryAction } from "../lib/jobAction.ts";
import { canSendQuote, isValidAmount } from "../lib/lineValidation.ts";
import { quoteTotal } from "../lib/quoteTotal.ts";

export type JobsClient = {
  findJobByConversationId(conversationId: ID): Promise<Job | null>;
  findJob(id: ID): Promise<Job | null>;
  listJobs(): Promise<Job[]>;
  saveJob(job: Job): Promise<void>;
};

// What the quote modal opens with: Zukki's pre-filled quote and who it is for.
export type QuoteDraft = { jobId: ID; title: string; customerName: string; quote: Quote };

// What the finish screen saves: one final amount per quote line, a reason when the total falls
// outside the estimate, and whether the owner asked the customer to share the photos.
export type FinishJobInput = { amounts: Money[]; reason?: string; asksToSharePhotos: boolean };

export type JobsDeps = { now: () => ISODate };

// Refusals answer null: an unknown id, an invalid quote, a status the job cannot move to, or a
// finish the rules forbid.
export type JobsService = {
  getQuoteDraft(conversationId: ID): Promise<QuoteDraft | null>;
  sendQuote(conversationId: ID, quote: Quote): Promise<Job | null>;
  getJob(id: ID): Promise<Job | null>;
  listJobs(): Promise<Job[]>;
  updateJobStatus(id: ID, status: JobStatus): Promise<Job | null>;
  finishJob(id: ID, final: FinishJobInput): Promise<Job | null>;
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

    listJobs: () => client.listJobs(),

    updateJobStatus: async (id, status) => {
      const job = await client.findJob(id);
      if (!job || primaryAction(job.status).nextStatus !== status) return null;

      return save(client, { ...job, status, timeline: [...job.timeline, ...eventsOnReaching(status, now())] });
    },

    finishJob: async (id, final) => {
      const job = await client.findJob(id);
      const reason = final.reason?.trim() ?? "";
      if (!job || !canFinish(job.status) || !isConsistentFinal(job, final.amounts)) return null;
      const total = finalTotal(final.amounts);
      if (estimateCheck(total, job.quote.total) !== "within" && reason === "") return null;

      return save(client, {
        ...job,
        status: "done",
        finalTotal: total,
        shareConsent: final.asksToSharePhotos ? "asked" : "not_asked",
        ...(reason === "" ? {} : { finalPriceReason: reason }),
        timeline: [...job.timeline, { at: now(), text: jobsCopys.timelineDone }],
      });
    },
  };
}

// A quote is sendable when every line is valid and the total is the sum of the lines.
function isConsistentQuote(quote: Quote): boolean {
  const total = quoteTotal(quote.lines);
  return canSendQuote(quote.lines) && quote.total.min === total.min && quote.total.max === total.max;
}

// Final amounts are consistent when there is one positive whole number per quote line.
function isConsistentFinal(job: Job, amounts: Money[]): boolean {
  return amounts.length === job.quote.lines.length && amounts.every(isValidAmount);
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
    listJobs: async () => structuredClone([...jobsById.values()]),
    saveJob: async (job) => {
      jobsById.set(job.id, structuredClone(job));
    },
  };
}

const QUOTE_APPROVED_TEXT = "Quote sent and approved";

// The demo client plays the customer: it approves every quote that is sent, at `now()`, and posts the
// quote to the conversation's thread the way the backend will.
export type FakeJobsClientDeps = { now: () => ISODate; threads: ThreadStore };

export function createFakeJobsClient(deps: Partial<FakeJobsClientDeps> = {}): JobsClient {
  const { now, threads } = { ...createDefaultDeps(), threads: createThreadStore(), ...deps };
  const store = createInMemoryJobsClient([anaJob, carlosJob, luciaJob, graceJob]);
  let quoteMessageCount = 0;

  function postQuoteMessage(job: Job, at: ISODate) {
    threads.append(job.conversationId, buildQuoteMessage(`m_quote_${++quoteMessageCount}`, job.quote, at));
  }

  function saveQuoted(job: Job) {
    const at = now();
    postQuoteMessage(job, at);
    return store.saveJob(approvedOnCustomersBehalf(job, at));
  }

  return {
    ...store,
    saveJob: (job) => (job.status === "quoted" ? saveQuoted(job) : store.saveJob(job)),
  };
}

// The owner's message for a sent quote: no `delivery`, since the polish A/B rule does not apply to it.
function buildQuoteMessage(id: ID, quote: Quote, sentAt: ISODate): Message {
  return { id, from: "owner", text: quoteMessageText(quote), sentAt, quote };
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

// Wall clock; the demo hooks inject a clock that starts at the designs' "12:07 AM".
function createDefaultDeps(): JobsDeps {
  return { now: () => new Date().toISOString() };
}
