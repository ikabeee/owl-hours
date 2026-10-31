import type { OwnerApi } from "../../../lib/ownerApi.ts";
import type { ID, Job, JobStatus, MoneyRange, Quote, QuoteLine } from "../../../shared/data/types.ts";
import type { JobsClient } from "./jobsService.ts";

// One job from GET /v1/owner/jobs(/:id) (public.owner_jobs).
export type ApiJob = {
  id: ID;
  conversationId: ID;
  title: string | null;
  state: string;
  customerName: string | null;
  technician: string | null;
  total: MoneyRange | null;
  finalTotal: number | null;
  location: { address: string | null } | null;
  quote: {
    lines: Array<{ label: string; min: number; max: number }>;
    total: MoneyRange;
    arrivalFrom: string;
    arrivalTo: string;
    note: string | null;
  } | null;
  shareConsent: string;
  timeline: Array<{ at: string; from: string | null; to: string }>;
};

// API states the app shows. A proposed job (accepted, no quote yet) reads as the owner's turn to quote;
// a sent quote reads as quoted. Requested, triaged, declined and cancelled jobs are not the owner's.
const STATUS_BY_STATE: Record<string, JobStatus> = {
  proposed: "owner_confirmed",
  owner_confirmed: "quoted",
  customer_approved: "customer_approved",
  en_route: "en_route",
  on_site: "on_site",
  done: "done",
};

const TIMELINE_TEXT: Record<string, string> = {
  proposed: "Request accepted",
  owner_confirmed: "Quote sent",
  customer_approved: "Quote approved",
  en_route: "On the way",
  on_site: "On site",
  done: "Done",
};

const SHARE_CONSENT = ["not_asked", "asked", "yes", "no"] as const;
const MINUTE_MS = 60_000;
const DRAFT_ARRIVAL_IN_MIN = 30;
const DRAFT_ARRIVAL_SPAN_MIN = 30;
const DEFAULT_REASON = "owner update";

// "12:55 AM" in the device's time zone, as the designs write arrival times.
export function clockText(iso: string): string {
  const date = new Date(iso);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? "AM" : "PM"}`;
}

// The next instant at that clock time, from an hour ago on, so a window just past midnight stays tonight.
function clockInstant(text: string, now: Date): string {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(text.trim());
  if (!match) return new Date(now.getTime() + DRAFT_ARRIVAL_IN_MIN * MINUTE_MS).toISOString();
  const hours = (Number(match[1]) % 12) + (match[3].toUpperCase() === "PM" ? 12 : 0);
  const date = new Date(now);
  date.setHours(hours, Number(match[2]), 0, 0);
  if (date.getTime() < now.getTime() - 60 * MINUTE_MS) date.setDate(date.getDate() + 1);
  return date.toISOString();
}

function roundedLater(now: Date, minutes: number): string {
  const step = 5 * MINUTE_MS;
  return new Date(Math.ceil((now.getTime() + minutes * MINUTE_MS) / step) * step).toISOString();
}

function toQuote(api: ApiJob, now: Date): Quote {
  const technician = api.technician ?? "";
  if (api.quote) {
    return {
      lines: api.quote.lines.map((line) => ({ label: line.label, amount: line.min === line.max ? line.min : { min: line.min, max: line.max } })),
      total: api.quote.total,
      arrival: { from: clockText(api.quote.arrivalFrom), to: clockText(api.quote.arrivalTo) },
      technician,
      ...(api.quote.note ? { note: api.quote.note } : {}),
    };
  }
  const total = api.total ?? { min: 0, max: 0 };
  return {
    lines: [{ label: "Visit and repair", amount: { ...total } }],
    total,
    arrival: {
      from: clockText(roundedLater(now, DRAFT_ARRIVAL_IN_MIN)),
      to: clockText(roundedLater(now, DRAFT_ARRIVAL_IN_MIN + DRAFT_ARRIVAL_SPAN_MIN)),
    },
    technician,
  };
}

export function toJob(api: ApiJob, now: Date): Job {
  const approval = api.timeline.find((event) => event.to === "customer_approved");
  const shareConsent = SHARE_CONSENT.find((value) => value === api.shareConsent) ?? "not_asked";
  return {
    id: api.id,
    conversationId: api.conversationId,
    title: api.title ?? "Request",
    customerName: api.customerName ?? "Customer",
    technician: api.technician ?? "",
    ...(api.location?.address ? { address: api.location.address } : {}),
    ...(approval ? { approvedAt: approval.at } : {}),
    quote: toQuote(api, now),
    ...(api.finalTotal === null ? {} : { finalTotal: api.finalTotal }),
    status: STATUS_BY_STATE[api.state] ?? "owner_confirmed",
    timeline: api.timeline.flatMap((event) => (TIMELINE_TEXT[event.to] ? [{ at: event.at, text: TIMELINE_TEXT[event.to] }] : [])),
    photos: { extra: [] },
    shareConsent,
  };
}

function toApiLine(line: QuoteLine) {
  return typeof line.amount === "number"
    ? { label: line.label, min: line.amount, max: line.amount }
    : { label: line.label, min: line.amount.min, max: line.amount.max };
}

// The jobs service decides what changed; saving a job posts a new quote or the next status.
export function createLiveJobsClient(api: OwnerApi, now: () => Date = () => new Date()): JobsClient {
  const isOwners = (job: ApiJob) => job.state in STATUS_BY_STATE;

  async function load(id: ID): Promise<Job | null> {
    const job = await api.get<ApiJob>(`/jobs/${id}`).catch(() => null);
    return job && isOwners(job) ? toJob(job, now()) : null;
  }

  return {
    findJob: load,

    findJobByConversationId: async (conversationId) => {
      const jobs = await api.get<ApiJob[]>("/jobs?limit=100");
      const job = jobs.find((candidate) => candidate.conversationId === conversationId && isOwners(candidate));
      return job ? toJob(job, now()) : null;
    },

    listJobs: async () => {
      const jobs = await api.get<ApiJob[]>("/jobs?limit=100");
      return jobs.filter((job) => isOwners(job) && job.state !== "proposed").map((job) => toJob(job, now()));
    },

    saveJob: async (job) => {
      const current = await load(job.id);
      if (!current) throw new Error("That job is no longer open.");
      const quoteChanged = current.status !== "quoted" || JSON.stringify(job.quote) !== JSON.stringify(current.quote);
      if (job.status === "quoted" && quoteChanged) {
        const at = now();
        await api.post(`/jobs/${job.id}/quote`, {
          lines: job.quote.lines.map(toApiLine),
          arrivalFrom: clockInstant(job.quote.arrival.from, at),
          arrivalTo: clockInstant(job.quote.arrival.to, at),
          ...(job.quote.note ? { note: job.quote.note } : {}),
        });
        return;
      }
      if (job.status !== current.status) {
        await api.post(`/jobs/${job.id}/transition`, { to: job.status, reason: job.finalPriceReason ?? DEFAULT_REASON });
      }
    },
  };
}
