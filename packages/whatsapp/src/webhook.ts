// Turns a Cloud API webhook body into flat events. Unknown fields are
// ignored; message types we do not handle come back as "unsupported" so
// the caller can log them instead of failing the whole batch.
import { z } from "zod";

export type InboundContent =
  | { kind: "text"; text: string }
  | { kind: "button_reply" | "list_reply"; id: string; title: string }
  | { kind: "location"; latitude: number; longitude: number; address: string | null }
  | {
      kind: "media";
      mediaType: "image" | "video" | "audio";
      waMediaId: string;
      mimeType: string;
      caption: string | null;
    }
  | { kind: "unsupported"; type: string };

export type WebhookEvent =
  | {
      type: "message";
      waId: string;
      profileName: string | null;
      waMessageId: string;
      receivedAt: string;
      content: InboundContent;
    }
  | { type: "status"; waMessageId: string; status: "sent" | "delivered" | "read" | "failed"; recipientWaId: string | null };

const media = z.object({ id: z.string().min(1), mime_type: z.string().min(1), caption: z.string().optional() });

const message = z
  .object({
    from: z.string().regex(/^[0-9]{6,20}$/),
    id: z.string().min(1).max(128),
    timestamp: z.string().regex(/^[0-9]+$/),
    type: z.string(),
    text: z.object({ body: z.string() }).optional(),
    interactive: z
      .object({
        type: z.string(),
        button_reply: z.object({ id: z.string(), title: z.string() }).optional(),
        list_reply: z.object({ id: z.string(), title: z.string() }).optional(),
      })
      .optional(),
    button: z.object({ payload: z.string(), text: z.string() }).optional(),
    location: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
        address: z.string().optional(),
        name: z.string().optional(),
      })
      .optional(),
    image: media.optional(),
    video: media.optional(),
    audio: media.omit({ caption: true }).optional(),
  })
  .passthrough();

const status = z
  .object({
    id: z.string().min(1),
    status: z.string(),
    recipient_id: z.string().optional(),
  })
  .passthrough();

const body = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z.array(
    z.object({
      changes: z.array(
        z.object({
          field: z.string(),
          value: z
            .object({
              contacts: z.array(z.object({ wa_id: z.string(), profile: z.object({ name: z.string() }).optional() })).optional(),
              messages: z.array(z.unknown()).optional(),
              statuses: z.array(z.unknown()).optional(),
            })
            .passthrough(),
        }),
      ),
    }),
  ),
});

const STATUSES = new Set(["sent", "delivered", "read", "failed"]);

export function parseWebhook(input: unknown): { events: WebhookEvent[]; skipped: number } {
  const parsed = body.safeParse(input);
  if (!parsed.success) {
    return { events: [], skipped: 1 };
  }
  const events: WebhookEvent[] = [];
  let skipped = 0;
  for (const entry of parsed.data.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") continue;
      const names = new Map((change.value.contacts ?? []).map((c) => [c.wa_id, c.profile?.name ?? null]));
      for (const raw of change.value.messages ?? []) {
        const m = message.safeParse(raw);
        if (!m.success) {
          skipped += 1;
          continue;
        }
        events.push({
          type: "message",
          waId: m.data.from,
          profileName: names.get(m.data.from) ?? null,
          waMessageId: m.data.id,
          receivedAt: new Date(Number(m.data.timestamp) * 1000).toISOString(),
          content: readContent(m.data),
        });
      }
      for (const raw of change.value.statuses ?? []) {
        const s = status.safeParse(raw);
        if (!s.success || !STATUSES.has(s.data.status)) {
          skipped += 1;
          continue;
        }
        events.push({
          type: "status",
          waMessageId: s.data.id,
          status: s.data.status as "sent" | "delivered" | "read" | "failed",
          recipientWaId: s.data.recipient_id ?? null,
        });
      }
    }
  }
  return { events, skipped };
}

function readContent(m: z.infer<typeof message>): InboundContent {
  switch (m.type) {
    case "text":
      return m.text ? { kind: "text", text: m.text.body } : { kind: "unsupported", type: m.type };
    case "interactive": {
      const reply = m.interactive?.button_reply ?? m.interactive?.list_reply;
      if (!reply) return { kind: "unsupported", type: `interactive:${m.interactive?.type ?? "?"}` };
      return { kind: m.interactive?.button_reply ? "button_reply" : "list_reply", id: reply.id, title: reply.title };
    }
    case "button":
      // Quick-reply button on a template message.
      return m.button ? { kind: "button_reply", id: m.button.payload, title: m.button.text } : { kind: "unsupported", type: m.type };
    case "location":
      return m.location
        ? {
            kind: "location",
            latitude: m.location.latitude,
            longitude: m.location.longitude,
            address: m.location.address ?? m.location.name ?? null,
          }
        : { kind: "unsupported", type: m.type };
    case "image":
    case "video":
    case "audio": {
      const item = m[m.type];
      if (!item) return { kind: "unsupported", type: m.type };
      return {
        kind: "media",
        mediaType: m.type,
        waMediaId: item.id,
        mimeType: item.mime_type,
        caption: "caption" in item && typeof item.caption === "string" ? item.caption : null,
      };
    }
    default:
      return { kind: "unsupported", type: m.type };
  }
}
