// Owner app data. Every call runs with the owner's own token, so row-level
// security is the tenant boundary; nothing here filters by tenant by hand.
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { ChatChoice, ChatRequest, QuoteLine } from "./owner-types.ts";
import { RepositoryError, createSupabaseRepository } from "../db/repository.ts";
import type { OwnerSession } from "../http/auth.ts";
import { HttpError } from "../http/respond.ts";
import { askTestZukki } from "../agent/test-zukki.ts";
import { unwrap } from "./db-result.ts";
import { polishOwnerMessage } from "./polish.ts";

export const SIGNED_MEDIA_SECONDS = 600;

type Item = Record<string, unknown>;
const items = z.array(z.record(z.unknown()));
const uuid = z.string().uuid();

const handoffRow = z.object({
  id: uuid,
  status: z.string(),
  expires_at: z.string(),
  resolved_at: z.string().nullable(),
  decline_reason: z.string().nullable().optional(),
});

function toOffer(row: z.infer<typeof handoffRow>) {
  return {
    id: row.id,
    status: row.status,
    expiresAt: row.expires_at,
    resolvedAt: row.resolved_at,
    declineReason: row.decline_reason ?? null,
  };
}

// Media ---------------------------------------------------------------------

function mediaObjects(value: unknown): Item[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is Item => typeof entry === "object" && entry !== null);
  }
  return typeof value === "object" && value !== null ? [value as Item] : [];
}

async function signPaths(db: SupabaseClient, paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths)];
  if (unique.length === 0) {
    return new Map();
  }
  const { data, error } = await db.storage.from("media").createSignedUrls(unique, SIGNED_MEDIA_SECONDS);
  if (error) {
    throw new RepositoryError(`could not sign media links: ${error.message}`, null);
  }
  return new Map(
    (data ?? []).flatMap((entry) =>
      entry.path && entry.signedUrl && !entry.error ? [[entry.path, entry.signedUrl] as const] : [],
    ),
  );
}

// Swaps storage paths for short-lived signed links (storage RLS applies).
async function withMediaLinks(db: SupabaseClient, list: Item[], key: string): Promise<Item[]> {
  const paths = list.flatMap((item) =>
    mediaObjects(item[key]).flatMap((media) =>
      [media.storagePath, media.thumbPath].filter((path): path is string => typeof path === "string"),
    ),
  );
  const links = await signPaths(db, paths);
  const convert = (media: Item): Item => {
    const { storagePath, thumbPath, ...rest } = media;
    return {
      ...rest,
      url: typeof storagePath === "string" ? (links.get(storagePath) ?? null) : null,
      thumbUrl: typeof thumbPath === "string" ? (links.get(thumbPath) ?? null) : null,
    };
  };
  return list.map((item) => {
    const value = item[key];
    if (Array.isArray(value)) {
      return { ...item, [key]: mediaObjects(value).map(convert) };
    }
    return { ...item, [key]: typeof value === "object" && value !== null ? convert(value as Item) : null };
  });
}

// Account -------------------------------------------------------------------

const membershipRows = z.array(
  z.object({ tenant_id: uuid, role: z.enum(["owner", "staff"]), display_name: z.string() }),
);
const tenantRows = z.array(
  z.object({ id: uuid, name: z.string(), short_name: z.string(), category: z.string(), accepts_now: z.boolean() }),
);

export async function getMe(s: OwnerSession) {
  const memberships = membershipRows.parse(
    unwrap(await s.db.from("tenant_users").select("tenant_id, role, display_name").eq("user_id", s.userId)),
  );
  const ids = memberships.map((m) => m.tenant_id);
  const tenants =
    ids.length === 0
      ? []
      : tenantRows.parse(
          unwrap(await s.db.from("tenants").select("id, name, short_name, category, accepts_now").in("id", ids)),
        );
  const byId = new Map(tenants.map((t) => [t.id, t]));
  return {
    userId: s.userId,
    businesses: memberships.flatMap((m) => {
      const tenant = byId.get(m.tenant_id);
      return tenant
        ? [{
            id: tenant.id,
            name: tenant.name,
            shortName: tenant.short_name,
            category: tenant.category,
            takingRequests: tenant.accepts_now,
            role: m.role,
            displayName: m.display_name,
          }]
        : [];
    }),
  };
}

// Requests (offers) ---------------------------------------------------------

export async function listOffers(s: OwnerSession, status: string, limit = 50) {
  const rows = items.parse(unwrap(await s.db.rpc("owner_offers", { p_status: status, p_limit: limit })));
  return withMediaLinks(s.db, rows, "media");
}

export async function acceptOffer(s: OwnerSession, offerId: string) {
  const offer = toOffer(handoffRow.parse(unwrap(await s.db.rpc("accept_handoff", { p_handoff_id: offerId }))));
  if (offer.status === "expired") {
    throw new HttpError(409, "offer_expired", "This request expired before you accepted it.");
  }
  return offer;
}

export async function declineOffer(s: OwnerSession, offerId: string, reason: string, note?: string | undefined) {
  return toOffer(
    handoffRow.parse(
      unwrap(await s.db.rpc("decline_handoff", { p_handoff_id: offerId, p_reason: reason, p_note: note ?? null })),
    ),
  );
}

// Chats ---------------------------------------------------------------------

export async function listConversations(s: OwnerSession, limit = 50) {
  return items.parse(unwrap(await s.db.rpc("owner_conversations", { p_limit: limit })));
}

export async function listMessages(s: OwnerSession, conversationId: string, before?: string, limit = 50) {
  const rows = items.parse(
    unwrap(
      await s.db.rpc("owner_conversation_messages", {
        p_conversation_id: conversationId,
        p_before: before ?? null,
        p_limit: limit,
      }),
    ),
  );
  return withMediaLinks(s.db, rows, "media");
}

// The business whose accepted handoff opened this chat for the owner.
async function openChatBusiness(s: OwnerSession, conversationId: string): Promise<string> {
  const row = z
    .object({ tenant_id: uuid })
    .nullable()
    .parse(
      unwrap(
        await s.db
          .from("handoffs")
          .select("tenant_id")
          .eq("conversation_id", conversationId)
          .eq("status", "accepted")
          .maybeSingle(),
      ),
    );
  if (!row) {
    throw new HttpError(422, "chat_closed", "This chat is not open to your business.");
  }
  return row.tenant_id;
}

const sentMessage = z.object({ id: uuid, created_at: z.string(), delivery: z.string() });

// Option A: the owner's text as written, queued for WhatsApp.
export async function sendMessage(s: OwnerSession, conversationId: string, text: string) {
  const tenantId = await openChatBusiness(s, conversationId);
  const row = sentMessage.parse(
    unwrap(
      await s.db
        .from("messages")
        .insert({ conversation_id: conversationId, tenant_id: tenantId, sender: "owner", author_user_id: s.userId, body: text })
        .select("id, created_at, delivery")
        .single(),
    ),
  );
  return { id: row.id, sentAt: row.created_at, status: row.delivery, delivery: "as_written" as const };
}

export async function markRead(s: OwnerSession, conversationId: string) {
  unwrap(await s.db.rpc("mark_conversation_read", { p_conversation_id: conversationId }));
  return { conversationId };
}

// Option B: save the owner's text, then ask Zukki for a clearer version.
// polished is null when the model is unavailable or changed a number.
export async function createDraft(
  s: OwnerSession,
  conversationId: string,
  text: string,
  deps: { serviceDb: SupabaseClient; chat?: (request: ChatRequest) => Promise<ChatChoice> },
) {
  const tenantId = await openChatBusiness(s, conversationId);
  const draft = z.object({ id: uuid }).parse(
    unwrap(
      await s.db
        .from("message_drafts")
        .insert({ conversation_id: conversationId, tenant_id: tenantId, author_user_id: s.userId, original_body: text })
        .select("id")
        .single(),
    ),
  );
  const polished = deps.chat ? await polishOwnerMessage(deps.chat, text).catch(() => null) : null;
  if (polished) {
    // Owners cannot write polished_body; the server does, scoped to this draft.
    unwrap(
      await deps.serviceDb
        .from("message_drafts")
        .update({ polished_body: polished.text, language: polished.language })
        .eq("id", draft.id)
        .eq("author_user_id", s.userId)
        .eq("status", "pending"),
    );
  }
  return { draftId: draft.id, original: text, polished: polished?.text ?? null, language: polished?.language ?? null };
}

export async function sendDraft(s: OwnerSession, draftId: string, usePolished: boolean) {
  const row = sentMessage
    .extend({ polished: z.boolean() })
    .parse(unwrap(await s.db.rpc("send_message_draft", { p_draft_id: draftId, p_use_polished: usePolished })));
  return { id: row.id, sentAt: row.created_at, status: row.delivery, delivery: row.polished ? "polished" : "as_written" };
}

// Jobs ----------------------------------------------------------------------

export async function listJobs(s: OwnerSession, limit = 50) {
  return items.parse(unwrap(await s.db.rpc("owner_jobs", { p_job_id: null, p_limit: limit })));
}

export async function getJob(s: OwnerSession, jobId: string) {
  const [job] = items.parse(unwrap(await s.db.rpc("owner_jobs", { p_job_id: jobId, p_limit: 1 })));
  if (!job) {
    throw new HttpError(404, "not_found", "Job not found.");
  }
  return job;
}

const quoteRow = z.object({
  id: uuid,
  job_id: uuid,
  status: z.string(),
  total_min: z.number(),
  total_max: z.number(),
  arrival_from: z.string(),
  arrival_to: z.string(),
});

export async function sendQuote(
  s: OwnerSession,
  jobId: string,
  quote: {
    lines: QuoteLine[];
    arrivalFrom: string;
    arrivalTo: string;
    technicianId?: string | undefined;
    note?: string | undefined;
  },
) {
  const row = quoteRow.parse(
    unwrap(
      await s.db.rpc("send_quote", {
        p_job_id: jobId,
        p_lines: quote.lines,
        p_arrival_from: quote.arrivalFrom,
        p_arrival_to: quote.arrivalTo,
        p_technician_id: quote.technicianId ?? null,
        p_note: quote.note ?? null,
      }),
    ),
  );
  return {
    id: row.id,
    jobId: row.job_id,
    status: row.status,
    total: { min: row.total_min, max: row.total_max },
    arrivalFrom: row.arrival_from,
    arrivalTo: row.arrival_to,
  };
}

export async function transitionJob(s: OwnerSession, jobId: string, to: string, reason: string) {
  const row = z
    .object({ id: uuid, state: z.string() })
    .parse(unwrap(await s.db.rpc("owner_transition_job", { p_job_id: jobId, p_to: to, p_reason: reason })));
  return { id: row.id, state: row.state };
}

// Test Zukki ----------------------------------------------------------------

export async function testZukki(
  s: OwnerSession,
  input: {
    question: string;
    history?: { role: "user" | "assistant"; content: string }[] | undefined;
    businessId?: string | undefined;
  },
  deps: { serviceDb: SupabaseClient; chat?: (request: ChatRequest) => Promise<ChatChoice> },
) {
  if (!deps.chat) {
    throw new HttpError(503, "model_unavailable", "Zukki's model is not connected yet.");
  }
  const { businesses } = await getMe(s);
  const business = input.businessId ? businesses.find((b) => b.id === input.businessId) : businesses[0];
  if (!business) {
    throw new HttpError(404, "not_found", "No business on this account.");
  }
  const { reply } = await askTestZukki({
    tenantId: business.id,
    question: input.question,
    history: input.history,
    chat: deps.chat,
    repo: createSupabaseRepository(deps.serviceDb),
  });
  return { businessId: business.id, reply };
}
