// Data access for the API and the agent, as service_role (bypasses RLS, so
// every query here is scoped by the caller). Rows are validated before use;
// database errors keep their Postgres code so callers can tell "not found"
// (P0002) from "changed since you read it" (40001). See docs/DATA-MODEL.md.
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { JOB_STATES } from "@owl-hours/shared";
import type { JobActor, JobState, Ticket } from "@owl-hours/shared";

export class RepositoryError extends Error {
  readonly code: string | null;

  constructor(message: string, code: string | null) {
    super(message);
    this.name = "RepositoryError";
    this.code = code;
  }
}

export type DirectoryMatch = {
  tenantId: string;
  slug: string;
  name: string;
  shortName: string;
  rating: number | null;
  reviewCount: number;
  nightJobs: boolean;
  openNow: boolean;
  etaMinutes: number | null;
  distanceKm: number;
};

export type BusinessHours = { weekday: number; opens: string; closes: string };

export type BusinessProfile = {
  id: string;
  name: string;
  category: string;
  timezone: string;
  website: string | null;
  rating: number | null;
  reviewCount: number;
  acceptsNow: boolean;
  nightJobs: boolean;
  hours: BusinessHours[];
};

export type PriceRuleRow = {
  item: string;
  kind: "callout" | "night_fee" | "repair_range" | "extra_fee";
  min: number;
  max: number;
  currency: string;
  conditions: string | null;
};

export type JobRow = { id: string; conversationId: string; tenantId: string; state: JobState };

export type JobTransition = { jobId: string; from: JobState; to: JobState; actor: JobActor; reason: string };

export type ZukkiRepository = {
  searchDirectory: (input: { conversationId: string; category: string; exclude?: string[] }) => Promise<DirectoryMatch[]>;
  getBusinessProfile: (tenantId: string) => Promise<BusinessProfile | null>;
  getPriceRules: (tenantId: string) => Promise<PriceRuleRow[]>;
  getJob: (jobId: string) => Promise<JobRow | null>;
  recordJobTransition: (input: JobTransition) => Promise<JobRow>;
  saveTicket: (jobId: string, ticket: Ticket) => Promise<void>;
};

// numeric columns may arrive as numbers or strings depending on precision.
const numeric = z.coerce.number();

const matchRow = z.object({
  tenant_id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  short_name: z.string(),
  rating: numeric.nullable(),
  review_count: z.number().int(),
  night_jobs: z.boolean(),
  open_now: z.boolean(),
  eta_minutes: z.number().int().nullable(),
  distance_km: numeric,
});

const profileRow = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.string(),
  timezone: z.string(),
  website: z.string().nullable(),
  rating: numeric.nullable(),
  review_count: z.number().int(),
  accepts_now: z.boolean(),
  night_jobs: z.boolean(),
  business_hours: z.array(z.object({ weekday: z.number().int(), opens: z.string(), closes: z.string() })),
});

const priceRow = z.object({
  item: z.string(),
  kind: z.enum(["callout", "night_fee", "repair_range", "extra_fee"]),
  min_amount: z.number().int(),
  max_amount: z.number().int(),
  currency: z.string(),
  conditions: z.string().nullable(),
});

const jobRow = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  state: z.enum(JOB_STATES),
});

type QueryResult = { data: unknown; error: { message: string; code?: string } | null };

function unwrap(result: QueryResult): unknown {
  if (result.error) {
    throw new RepositoryError(result.error.message, result.error.code ?? null);
  }
  return result.data;
}

function parse<T extends z.ZodTypeAny>(schema: T, data: unknown, source: string): z.infer<T> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const where = parsed.error.issues[0]?.path.join(".") ?? "";
    throw new RepositoryError(`unexpected row from ${source} at "${where}"`, null);
  }
  return parsed.data;
}

function toJob(row: z.infer<typeof jobRow>): JobRow {
  return { id: row.id, conversationId: row.conversation_id, tenantId: row.tenant_id, state: row.state };
}

export function createSupabaseRepository(client: SupabaseClient): ZukkiRepository {
  return {
    async searchDirectory({ conversationId, category, exclude }) {
      const data = unwrap(
        await client.rpc("search_directory_for_conversation", {
          p_conversation_id: conversationId,
          p_category: category,
          p_exclude: exclude ?? [],
        }),
      );
      return parse(z.array(matchRow), data, "search_directory_for_conversation").map((row) => ({
        tenantId: row.tenant_id,
        slug: row.slug,
        name: row.name,
        shortName: row.short_name,
        rating: row.rating,
        reviewCount: row.review_count,
        nightJobs: row.night_jobs,
        openNow: row.open_now,
        etaMinutes: row.eta_minutes,
        distanceKm: row.distance_km,
      }));
    },

    async getBusinessProfile(tenantId) {
      const data = unwrap(
        await client
          .from("tenants")
          .select(
            "id, name, category, timezone, website, rating, review_count, accepts_now, night_jobs, business_hours(weekday, opens, closes)",
          )
          .eq("id", tenantId)
          .limit(1),
      );
      const [row] = parse(z.array(profileRow), data, "tenants");
      if (!row) {
        return null;
      }
      return {
        id: row.id,
        name: row.name,
        category: row.category,
        timezone: row.timezone,
        website: row.website,
        rating: row.rating,
        reviewCount: row.review_count,
        acceptsNow: row.accepts_now,
        nightJobs: row.night_jobs,
        hours: row.business_hours,
      };
    },

    async getPriceRules(tenantId) {
      const data = unwrap(
        await client
          .from("price_rules")
          .select("item, kind, min_amount, max_amount, currency, conditions")
          .eq("tenant_id", tenantId)
          .order("kind")
          .order("item"),
      );
      return parse(z.array(priceRow), data, "price_rules").map((row) => ({
        item: row.item,
        kind: row.kind,
        min: row.min_amount,
        max: row.max_amount,
        currency: row.currency,
        conditions: row.conditions,
      }));
    },

    async getJob(jobId) {
      const data = unwrap(
        await client.from("jobs").select("id, conversation_id, tenant_id, state").eq("id", jobId).limit(1),
      );
      const [row] = parse(z.array(jobRow), data, "jobs");
      return row ? toJob(row) : null;
    },

    async recordJobTransition({ jobId, from, to, actor, reason }) {
      const data = unwrap(
        await client.rpc("record_job_transition", {
          p_job_id: jobId,
          p_from: from,
          p_to: to,
          p_actor: actor,
          p_reason: reason,
        }),
      );
      return toJob(parse(jobRow, data, "record_job_transition"));
    },

    async saveTicket(jobId, ticket) {
      const data = unwrap(
        await client
          .from("jobs")
          .update({
            ticket,
            title: ticket.title,
            total_min: ticket.quote.total_min,
            total_max: ticket.quote.total_max,
            arrival_window: ticket.arrival_window,
          })
          .eq("id", jobId)
          .select("id"),
      );
      if (!Array.isArray(data) || data.length === 0) {
        throw new RepositoryError("job not found", "P0002");
      }
    },
  };
}
