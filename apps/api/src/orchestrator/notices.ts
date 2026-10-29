// Notices that follow the owner's actions, not a customer message:
// accepted (payload 10), expired or declined (09, then 07 for the next
// business) and a sent quote (13). Polled every few seconds; each notice
// carries a key in its payload so it is sent once.
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { isCategory, type Category } from "@owl-hours/shared";
import { unwrap } from "../services/db-result.ts";
import { errorText, type Logger } from "../whatsapp/inbound.ts";
import * as copy from "./copy.ts";
import type { ConversationStore, Directory } from "./types.ts";

// Older changes are history, not news: never notify about them.
const LOOKBACK_MS = 2 * 60 * 60 * 1000;
const BATCH = 100;
// A newer offer or chat replaces the "next business" step.
const BUSY_STATES = new Set(["offered", "accepted", "chatting"]);

const uuid = z.string().uuid();
const handoffRow = z.object({ id: uuid, conversation_id: uuid, tenant_id: uuid, status: z.string() });
const quoteRow = z.object({
  id: uuid,
  job_id: uuid,
  tenant_id: uuid,
  lines: z.array(z.object({ label: z.string(), min: z.number(), max: z.number() })),
  total_min: z.number(),
  total_max: z.number(),
  currency: z.string(),
  technician_id: uuid.nullable(),
});
const jobRow = z.object({ id: uuid, conversation_id: uuid, arrival_window: z.string().nullable() });
const conversationRow = z.object({ id: uuid, state: z.string(), category: z.string().nullable() });

export type PendingQuote = Omit<z.infer<typeof quoteRow>, "job_id"> & { conversationId: string; arrivalWindow: string | null };

export type NoticeAction =
  | { kind: "accepted"; conversationId: string; tenantId: string; notice: string }
  | {
      kind: "next";
      conversationId: string;
      tenantId: string;
      reason: "expired" | "declined";
      category: Category | null;
      notice: string;
    }
  | { kind: "quote"; conversationId: string; quote: PendingQuote; notice: string };

export function planNotices(input: {
  handoffs: Array<z.infer<typeof handoffRow>>;
  quotes: PendingQuote[];
  conversations: Array<z.infer<typeof conversationRow>>;
  sent: Set<string>;
}): NoticeAction[] {
  const conversations = new Map(input.conversations.map((c) => [c.id, c]));
  const actions: NoticeAction[] = [];
  for (const h of input.handoffs) {
    const notice = `handoff:${h.id}:${h.status}`;
    if (input.sent.has(notice)) continue;
    if (h.status === "accepted") {
      actions.push({ kind: "accepted", conversationId: h.conversation_id, tenantId: h.tenant_id, notice });
      continue;
    }
    const conversation = conversations.get(h.conversation_id);
    if ((h.status === "expired" || h.status === "declined") && conversation && !BUSY_STATES.has(conversation.state)) {
      const category = conversation.category && isCategory(conversation.category) ? conversation.category : null;
      actions.push({ kind: "next", conversationId: h.conversation_id, tenantId: h.tenant_id, reason: h.status, category, notice });
    }
  }
  for (const q of input.quotes) {
    const notice = `quote:${q.id}`;
    if (!input.sent.has(notice)) actions.push({ kind: "quote", conversationId: q.conversationId, quote: q, notice });
  }
  return actions;
}

export type NoticeDeps = { db: SupabaseClient; store: ConversationStore; directory: Directory; log: Logger };

export async function runNotices(deps: NoticeDeps, now: Date = new Date()): Promise<number> {
  const since = new Date(now.getTime() - LOOKBACK_MS).toISOString();
  // Capped at now: demo seed rows are dated in the future and must never be announced.
  const until = now.toISOString();
  const { db } = deps;
  const handoffs = z.array(handoffRow).parse(
    unwrap(
      await db
        .from("handoffs")
        .select("id, conversation_id, tenant_id, status")
        .in("status", ["accepted", "expired", "declined"])
        .gte("resolved_at", since)
        .lte("resolved_at", until)
        .order("resolved_at", { ascending: true })
        .limit(BATCH),
    ),
  );
  const quotes = await pendingQuotes(db, since, until);
  const conversationIds = [...new Set([...handoffs.map((h) => h.conversation_id), ...quotes.map((q) => q.conversationId)])];
  if (conversationIds.length === 0) return 0;

  const conversations = z
    .array(conversationRow)
    .parse(unwrap(await db.from("conversations").select("id, state, category").in("id", conversationIds)));
  const sentRows = z
    .array(z.object({ payload: z.record(z.unknown()).nullable() }))
    .parse(
      unwrap(
        await db
          .from("messages")
          .select("payload")
          .in("conversation_id", conversationIds)
          .eq("sender", "zukki")
          .not("payload->>notice", "is", null),
      ),
    );
  const sent = new Set(sentRows.map((row) => String(row.payload?.notice ?? "")));

  let done = 0;
  for (const action of planNotices({ handoffs, quotes, conversations, sent })) {
    try {
      await perform(deps, action);
      done += 1;
    } catch (error) {
      deps.log.error(`zukki: notice ${action.notice} failed: ${errorText(error)}`);
    }
  }
  return done;
}

async function pendingQuotes(db: SupabaseClient, since: string, until: string): Promise<PendingQuote[]> {
  const quotes = z.array(quoteRow).parse(
    unwrap(
      await db
        .from("quotes")
        .select("id, job_id, tenant_id, lines, total_min, total_max, currency, technician_id")
        .eq("status", "sent")
        .gte("sent_at", since)
        .lte("sent_at", until)
        .limit(BATCH),
    ),
  );
  if (quotes.length === 0) return [];
  const jobs = z
    .array(jobRow)
    .parse(unwrap(await db.from("jobs").select("id, conversation_id, arrival_window").in("id", quotes.map((q) => q.job_id))));
  return quotes.flatMap(({ job_id, ...q }) => {
    const job = jobs.find((j) => j.id === job_id);
    return job ? [{ ...q, conversationId: job.conversation_id, arrivalWindow: job.arrival_window }] : [];
  });
}

async function perform(deps: NoticeDeps, action: NoticeAction): Promise<void> {
  if (action.kind === "quote") {
    const q = action.quote;
    const businessName = (await deps.store.businessName(q.tenant_id)) ?? "the business";
    const technician = q.technician_id ? await technicianName(deps.db, q.technician_id) : null;
    const message = copy.quote(
      {
        quoteId: q.id,
        businessName,
        technician,
        arrivalWindow: q.arrivalWindow,
        lines: q.lines,
        totalMin: q.total_min,
        totalMax: q.total_max,
        currency: q.currency,
      },
      action.notice,
    );
    await deps.store.queue(action.conversationId, message, q.tenant_id);
    return;
  }
  const name = (await deps.store.businessName(action.tenantId)) ?? "The business";
  if (action.kind === "accepted") {
    await deps.store.queue(action.conversationId, copy.accepted(name, action.notice), action.tenantId);
    return;
  }
  const [best] = action.category ? await deps.directory.matches(action.conversationId, action.category) : [];
  if (!best || !action.category) {
    await deps.store.queue(action.conversationId, copy.noNextBusiness(name, action.reason, action.category, action.notice));
    return;
  }
  await deps.store.queue(action.conversationId, copy.nextBusiness(name, action.reason, action.notice));
  await deps.store.queue(action.conversationId, copy.suggestion(best, action.category, { afterTimeout: true }));
}

async function technicianName(db: SupabaseClient, id: string): Promise<string | null> {
  const row = z
    .object({ display_name: z.string() })
    .nullable()
    .parse(unwrap(await db.from("technicians").select("display_name").eq("id", id).maybeSingle()));
  return row?.display_name ?? null;
}

// One run at a time; a failing run is logged and retried on the next tick.
export function startNoticeLoop(deps: NoticeDeps, intervalMs: number) {
  let running: Promise<void> | null = null;
  const tick = () => {
    if (running) return;
    running = runNotices(deps)
      .then((done) => {
        if (done > 0) deps.log.info(`zukki: queued ${done} notice(s)`);
      })
      .catch((error: unknown) => deps.log.error(`zukki: notices failed: ${errorText(error)}`))
      .finally(() => {
        running = null;
      });
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref();
  return {
    tick,
    async stop(): Promise<void> {
      clearInterval(timer);
      await running;
    },
  };
}
