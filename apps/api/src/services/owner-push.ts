// Owner push notifications over the Expo Push Service
// (https://docs.expo.dev/push-notifications/sending-notifications/): when
// Zukki offers a request to a business, every owner of that business gets a
// push with the request category, the offer id in data and the approximate
// distance only, never the address. Sends go through an injected fetch, so
// tests never touch the network and no push SDK is needed.
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { unwrap } from "./db-result.ts";

// POST a single message or an array of up to 100 messages; no auth.
export const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
// A hanging Expo call must not hold "Connect me": the push aborts after a few
// seconds, and the timeout counts as a failure (the offer stands).
export const EXPO_PUSH_TIMEOUT_MS = 5_000;
// Android channel id the app registers for urgent requests (S4); Expo routes by id, not by the "Urgent requests" display name.
export const REQUEST_CHANNEL_ID = "urgent-requests";
// Notification category the app registers with its Open/Decline actions.
export const REQUEST_CATEGORY = "request";
// The push outlives the offer window, so its image link lasts a day.
const THUMB_LINK_SECONDS = 86_400;

export type RequestPushInput = {
  requestId: string;
  title: string;
  summary: string;
  distanceKm: number | null;
  urgent: boolean;
  thumbnailUrl: string | null;
};

export type BuiltRequestPush = {
  title: string;
  body: string;
  data: { requestId: string; category: string };
  channelId: string;
  image: string | null;
};

export function buildRequestPush(input: RequestPushInput): BuiltRequestPush {
  const distance = input.distanceKm === null ? "" : `, ${input.distanceKm} km`;
  const title = input.urgent ? `Urgent: ${input.title}${distance}` : `${input.title}${distance}`;
  const sentence = withTerminalPunctuation(input.summary.trim());
  const window = input.urgent ? 5 : 30;
  return {
    title,
    body: `${sentence} Accept within ${window} minutes or Zukki offers it to another business.`,
    data: { requestId: input.requestId, category: REQUEST_CATEGORY },
    channelId: REQUEST_CHANNEL_ID,
    image: input.thumbnailUrl,
  };
}

export type OwnerPushToken = { userId: string; expoToken: string; platform: string };

export type PushTokenStore = {
  // Only tokens of owners of this business (tenant isolation).
  listTokens(businessId: string): Promise<OwnerPushToken[]>;
  removeToken(expoToken: string): Promise<void>;
};

export function createSupabasePushTokenStore(db: SupabaseClient): PushTokenStore {
  return {
    async listTokens(businessId) {
      const members = z
        .array(z.object({ user_id: z.string().uuid() }))
        .parse(unwrap(await db.from("tenant_users").select("user_id").eq("tenant_id", businessId)));
      const ids = [...new Set(members.map((member) => member.user_id))];
      if (ids.length === 0) {
        return [];
      }
      const tokens = z
        .array(
          z.object({ user_id: z.string().uuid(), expo_token: z.string(), platform: z.string() }),
        )
        .parse(unwrap(await db.from("push_tokens").select("user_id, expo_token, platform").in("user_id", ids)));
      const allowed = new Set(ids);
      return tokens
        .filter((token) => allowed.has(token.user_id))
        .map((token) => ({ userId: token.user_id, expoToken: token.expo_token, platform: token.platform }));
    },

    async removeToken(expoToken) {
      unwrap(await db.from("push_tokens").delete().eq("expo_token", expoToken));
    },
  };
}

export type PushSummary = { sent: number; failed: number; removed: string[] };

export async function sendOfferPush(
  store: PushTokenStore,
  push: typeof fetch,
  input: { businessId: string; notification: BuiltRequestPush },
  options?: { timeoutMs?: number } | undefined,
): Promise<PushSummary> {
  const tokens = await store.listTokens(input.businessId);
  const summary: PushSummary = { sent: 0, failed: 0, removed: [] };
  if (tokens.length === 0) {
    return summary;
  }
  let tickets: PushTicket[];
  try {
    const response = await push(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", "accept-encoding": "gzip, deflate" },
      body: JSON.stringify(tokens.map((token) => toExpoMessage(token.expoToken, input.notification))),
      signal: AbortSignal.timeout(options?.timeoutMs ?? EXPO_PUSH_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`expo push failed with status ${response.status}`);
    }
    tickets = parseTickets(await response.json());
  } catch {
    summary.failed = tokens.length;
    return summary;
  }
  for (const [index, token] of tokens.entries()) {
    const ticket = tickets[index];
    if (ticket?.status === "ok") {
      summary.sent += 1;
      continue;
    }
    summary.failed += 1;
    if (ticket?.details?.error === "DeviceNotRegistered") {
      await store.removeToken(token.expoToken).then(
        () => summary.removed.push(token.expoToken),
        () => {},
      );
    }
  }
  return summary;
}

// Best-effort offer push for connectBusiness: resolves the request content,
// sends to the business's owners, and never throws, so a push failure never
// blocks or rolls back the offer (S11).
export async function notifyOfferOwners(
  db: SupabaseClient,
  push: typeof fetch,
  input: { conversationId: string; businessId: string; offerId: string; distanceKm: number | null },
): Promise<PushSummary> {
  const conversation = z
    .object({
      title: z.string().nullable(),
      summary: z.string().nullable(),
      urgency: z.enum(["now", "today", "week"]).nullable(),
    })
    .parse(
      unwrap(
        await db.from("conversations").select("title, summary, urgency").eq("id", input.conversationId).single(),
      ),
    );
  const notification = buildRequestPush({
    requestId: input.offerId,
    title: conversation.title ?? "New request",
    summary: conversation.summary ?? "",
    distanceKm: input.distanceKm,
    urgent: conversation.urgency === "now",
    thumbnailUrl: await offerThumbnailUrl(db, input.conversationId),
  });
  return sendOfferPush(createSupabasePushTokenStore(db), push, { businessId: input.businessId, notification });
}

type PushTicket = { status: string; details?: { error: string } | undefined };

function withTerminalPunctuation(summary: string): string {
  return /[.!?]$/.test(summary) ? summary : `${summary}.`;
}

function toExpoMessage(expoToken: string, notification: BuiltRequestPush): Record<string, unknown> {
  return {
    to: expoToken,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    channelId: notification.channelId,
    categoryId: notification.data.category,
    sound: "default",
    ...(notification.image ? { richContent: { image: notification.image } } : {}),
  };
}

const ticketSchema = z
  .object({ status: z.string(), details: z.object({ error: z.string() }).passthrough().optional() })
  .passthrough();

function parseTickets(body: unknown): PushTicket[] {
  const parsed = z.object({ data: z.union([ticketSchema, z.array(ticketSchema)]) }).safeParse(body);
  if (!parsed.success) {
    return [];
  }
  const tickets = Array.isArray(parsed.data.data) ? parsed.data.data : [parsed.data.data];
  return tickets.map((ticket) => ({ status: ticket.status, details: ticket.details }));
}

async function offerThumbnailUrl(db: SupabaseClient, conversationId: string): Promise<string | null> {
  const rows = z
    .array(z.object({ thumb_path: z.string().nullable() }))
    .parse(
      unwrap(
        await db
          .from("media")
          .select("thumb_path")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })
          .limit(5),
      ),
    );
  const path = rows.find((row) => row.thumb_path)?.thumb_path;
  if (!path) {
    return null;
  }
  const { data, error } = await db.storage.from("media").createSignedUrl(path, THUMB_LINK_SECONDS);
  return error || !data ? null : data.signedUrl;
}
