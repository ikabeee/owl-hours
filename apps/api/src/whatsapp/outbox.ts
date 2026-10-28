// Sends queued owner and Zukki messages through the Cloud API, in the
// formats of handoff-ui/whatsapp/payloads (11 as written, 12 polished).
// claim_outbox marks each row sent; the result is then recorded with
// WhatsApp's id, or as failed.
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { buttonMessage, textMessage, type OutgoingMessage, type WhatsAppClient } from "@owl-hours/whatsapp";
import { unwrap } from "../services/db-result.ts";
import * as whatsapp from "../services/whatsapp-service.ts";
import { errorText, type Logger } from "./inbound.ts";

const INTERACTIVE_BODY_MAX = 1024;
export const POLISHED_BUTTONS = [
  { id: "reply_ok", title: "Sounds good" },
  { id: "reply_question", title: "Ask a question" },
];

const outboxRow = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  waId: z.string().regex(/^[0-9]{6,20}$/),
  sender: z.enum(["zukki", "owner"]),
  kind: z.string(),
  body: z.string().nullable(),
  payload: z.record(z.unknown()).nullable(),
  businessName: z.string().nullable(),
  businessShortName: z.string().nullable(),
});
export type OutboxRow = z.infer<typeof outboxRow>;

export type OutboxDeps = {
  db: SupabaseClient;
  client: Pick<WhatsAppClient, "send">;
  log: Logger;
};

// null: a kind this sender does not handle yet (it is marked failed).
export function renderOutbound(row: OutboxRow, senderFirstName: string | null): OutgoingMessage | null {
  if (!row.body) {
    return null;
  }
  if (row.sender === "zukki") {
    return row.kind === "text" ? textMessage(row.waId, row.body) : null;
  }
  const business = row.businessName ?? "Your business";
  const signed = `*${senderFirstName ? `${business} · ${senderFirstName}` : business}*\n${row.body}`;
  if (row.kind === "text") {
    return textMessage(row.waId, signed);
  }
  if (row.kind === "interactive" && row.payload?.variant === "polished_reply") {
    const footer = `Written with Zukki, approved by ${row.businessShortName ?? business}`;
    if (signed.length > INTERACTIVE_BODY_MAX) {
      // Too long for a button message: same words, footer as the last line.
      return textMessage(row.waId, `${signed}\n\n_${footer}_`);
    }
    return buttonMessage(row.waId, { body: signed, buttons: POLISHED_BUTTONS, footer });
  }
  return null;
}

export async function drainOutbox(deps: OutboxDeps, limit = 20): Promise<{ sent: number; failed: number }> {
  const rows = z.array(outboxRow).parse(await whatsapp.claimOutbox(deps.db, limit));
  if (rows.length === 0) {
    return { sent: 0, failed: 0 };
  }
  const names = await senderFirstNames(deps.db, rows);
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    const message = renderOutbound(row, names.get(row.id) ?? null);
    let waMessageId: string | null = null;
    if (!message) {
      deps.log.warn(`whatsapp: outbox message ${row.id} (${row.sender} ${row.kind}) has no WhatsApp format yet`);
    } else {
      try {
        waMessageId = await deps.client.send(message);
      } catch (error) {
        deps.log.error(`whatsapp: send of outbox message ${row.id} failed: ${errorText(error)}`);
      }
    }
    await whatsapp.recordOutboundResult(deps.db, row.id, waMessageId);
    if (waMessageId) sent += 1;
    else failed += 1;
  }
  return { sent, failed };
}

// Owner messages are signed with the author's first name (payload 11/12).
async function senderFirstNames(db: SupabaseClient, rows: OutboxRow[]): Promise<Map<string, string>> {
  const ownerIds = rows.filter((r) => r.sender === "owner").map((r) => r.id);
  if (ownerIds.length === 0) {
    return new Map();
  }
  const authors = z
    .array(z.object({ id: z.string(), tenant_id: z.string().nullable(), author_user_id: z.string().nullable() }))
    .parse(unwrap(await db.from("messages").select("id, tenant_id, author_user_id").in("id", ownerIds)));
  const userIds = [...new Set(authors.flatMap((a) => (a.author_user_id ? [a.author_user_id] : [])))];
  if (userIds.length === 0) {
    return new Map();
  }
  const people = z
    .array(z.object({ tenant_id: z.string(), user_id: z.string(), display_name: z.string() }))
    .parse(unwrap(await db.from("tenant_users").select("tenant_id, user_id, display_name").in("user_id", userIds)));
  const names = new Map<string, string>();
  for (const author of authors) {
    const person = people.find((p) => p.user_id === author.author_user_id && p.tenant_id === author.tenant_id);
    const first = person?.display_name.trim().split(/\s+/)[0];
    if (first) names.set(author.id, first);
  }
  return names;
}
