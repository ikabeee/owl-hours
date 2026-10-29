// Server-to-server endpoints for the WhatsApp integration. They need the
// x-zukki-key header and use the service_role client, so each one is
// scoped by an id the server already resolved.
import { Hono } from "hono";
import { z } from "zod";
import { CATEGORIES } from "@owl-hours/shared";
import { requireServerKey } from "../http/auth.ts";
import { rateLimit } from "../http/rate-limit.ts";
import { HttpError, errorResponse, ok, readId, readJson, readQuery } from "../http/respond.ts";
import * as whatsapp from "../services/whatsapp-service.ts";
import { processMessage } from "../worker/process-message.ts";
import { textMessage, type WhatsAppClient } from "@owl-hours/whatsapp";
import { drainOutbox } from "../whatsapp/outbox.ts";
import type { V1Deps } from "./v1.ts";

const waId = z.string().regex(/^[0-9]{6,20}$/, "6-20 digits, no plus sign");
const waMessageId = z.string().min(1).max(128);
const receivedAt = z.string().datetime({ offset: true }).optional();
const profileName = z.string().max(200).optional();

const inboundBody = z
  .object({
    waId,
    waMessageId,
    kind: z.enum(["text", "media", "button_reply", "list_reply"]),
    text: z.string().max(4096).optional(),
    payload: z.record(z.unknown()).optional(),
    mediaId: z.string().uuid().optional(),
    profileName,
    receivedAt,
  })
  .strict()
  .refine((m) => m.kind !== "text" || Boolean(m.text), { message: "text is required", path: ["text"] })
  .refine((m) => m.kind !== "media" || Boolean(m.mediaId), { message: "mediaId is required", path: ["mediaId"] })
  .refine((m) => !m.kind.endsWith("_reply") || typeof m.payload?.id === "string", {
    message: "payload.id (the reply id) is required",
    path: ["payload"],
  });

const locationBody = z
  .object({
    waMessageId,
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    address: z.string().max(300).optional(),
    receivedAt,
  })
  .strict();

const matchesQuery = z.object({
  category: z.enum(CATEGORIES),
  exclude: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(",").map((id) => id.trim()).filter(Boolean) : []))
    .pipe(z.array(z.string().uuid()).max(20)),
});

const connectBody = z
  .object({
    businessId: z.string().uuid(),
    suggestedMin: z.number().int().min(0).optional(),
    suggestedMax: z.number().int().min(0).optional(),
  })
  .strict()
  .refine((b) => (b.suggestedMin === undefined) === (b.suggestedMax === undefined), "send both suggestedMin and suggestedMax, or neither")
  .refine((b) => b.suggestedMax === undefined || b.suggestedMin === undefined || b.suggestedMax >= b.suggestedMin, "suggestedMax is below suggestedMin");

const assistBody = z
  .object({
    type: z.enum(["text", "audio", "image", "video"]),
    text: z.string().max(4096).optional(),
    caption: z.string().max(1024).optional(),
    // Our media row id (the file is read from the media bucket).
    mediaId: z.string().uuid().optional(),
    firstInConversation: z.boolean().optional(),
  })
  .strict();

function requireWhatsApp(client: Pick<WhatsAppClient, "send"> | undefined): Pick<WhatsAppClient, "send"> {
  if (!client) {
    throw new HttpError(503, "whatsapp_not_configured", "WhatsApp is not configured on this server.");
  }
  return client;
}

export function internalRoutes(deps: V1Deps): Hono {
  const app = new Hono();
  app.onError((error, c) => errorResponse(c, error));
  app.use("*", requireServerKey(deps.serverKey));
  app.use("*", rateLimit({ limit: 3000, windowMs: 60_000, key: () => "internal", now: deps.now }));

  app.post("/inbound", async (c) => {
    const body = await readJson(c, inboundBody);
    return ok(c, await whatsapp.recordInbound(deps.serviceDb, body));
  });
  app.post("/conversations/resolve", async (c) => {
    const body = await readJson(c, z.object({ waId, profileName, receivedAt }).strict());
    return ok(c, await whatsapp.resolveConversation(deps.serviceDb, body));
  });
  app.post("/conversations/:id/location", async (c) => {
    const id = readId(c);
    const body = await readJson(c, locationBody);
    return ok(c, await whatsapp.saveLocation(deps.serviceDb, { conversationId: id, ...body }));
  });
  app.get("/conversations/:id/matches", async (c) => {
    const id = readId(c);
    const query = readQuery(c, matchesQuery);
    return ok(c, await whatsapp.findMatches(deps.serviceDb, { conversationId: id, category: query.category, exclude: query.exclude }));
  });
  app.post("/conversations/:id/connect", async (c) => {
    const id = readId(c);
    const body = await readJson(c, connectBody);
    return ok(c, await whatsapp.connectBusiness(deps.serviceDb, { conversationId: id, ...body }), 201);
  });
  app.post("/conversations/:id/assist", async (c) => {
    const id = readId(c);
    const body = await readJson(c, assistBody);
    const pipeline = whatsapp.requirePipeline(deps.pipeline);
    const result = await processMessage({ conversationId: id, ...body }, pipeline);
    return ok(c, result);
  });
  app.post("/quotes/:id/approve", async (c) => ok(c, await whatsapp.approveQuote(deps.serviceDb, readId(c))));

  app.post("/outbox/claim", async (c) => {
    const body = await readJson(c, z.object({ limit: z.number().int().min(1).max(100).optional() }).strict());
    return ok(c, await whatsapp.claimOutbox(deps.serviceDb, body.limit));
  });
  // Sends whatever is queued now (the server also does this on a timer).
  app.post("/outbox/send", async (c) => {
    const body = await readJson(c, z.object({ limit: z.number().int().min(1).max(100).optional() }).strict());
    const client = requireWhatsApp(deps.whatsapp);
    return ok(c, await drainOutbox({ db: deps.serviceDb, client, log: console }, body.limit));
  });
  // Direct send for testing the number. Not stored in any conversation, and
  // WhatsApp only delivers free text within 24 hours of the customer's last
  // message.
  app.post("/whatsapp/send", async (c) => {
    const body = await readJson(c, z.object({ to: waId, text: z.string().min(1).max(4096) }).strict());
    const client = requireWhatsApp(deps.whatsapp);
    return ok(c, { waMessageId: await client.send(textMessage(body.to, body.text)) });
  });
  app.post("/messages/:id/result", async (c) => {
    const id = readId(c);
    const body = await readJson(c, z.object({ waMessageId: waMessageId.nullable() }).strict());
    return ok(c, await whatsapp.recordOutboundResult(deps.serviceDb, id, body.waMessageId));
  });
  app.post("/delivery-status", async (c) => {
    const body = await readJson(c, z.object({ waMessageId, status: z.enum(["delivered", "read", "failed"]) }).strict());
    return ok(c, await whatsapp.recordDeliveryStatus(deps.serviceDb, body.waMessageId, body.status));
  });

  return app;
}
