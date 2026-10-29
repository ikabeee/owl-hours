// Owner app endpoints. Every route needs the owner's Supabase token and runs
// as that user, so each business only ever reaches its own data.
import { Hono } from "hono";
import { z } from "zod";
import { requireOwner, type OwnerEnv } from "../http/auth.ts";
import { rateLimit } from "../http/rate-limit.ts";
import { errorResponse, ok, readId, readJson, readQuery } from "../http/respond.ts";
import * as owner from "../services/owner-service.ts";
import type { V1Deps } from "./v1.ts";

const limit = z.coerce.number().int().min(1).max(100).optional();
const text = z.string().trim().min(1).max(4096);
const isoTime = z.string().datetime({ offset: true });

const offerQuery = z.object({
  status: z.enum(["offered", "accepted", "declined", "expired", "closed"]).default("offered"),
  limit,
});
const declineBody = z
  .object({ reason: z.enum(["busy", "too_far", "not_offered", "other"]), note: z.string().trim().max(500).optional() })
  .strict();
const messagesQuery = z.object({ before: isoTime.optional(), limit: z.coerce.number().int().min(1).max(200).optional() });
const quoteBody = z
  .object({
    lines: z
      .array(
        z
          .object({ label: z.string().trim().min(1).max(60), min: z.number().int().min(0), max: z.number().int().min(0) })
          .strict()
          .refine((line) => line.max >= line.min, "max must be at least min"),
      )
      .min(1)
      .max(12),
    arrivalFrom: isoTime,
    arrivalTo: isoTime,
    technicianId: z.string().uuid().optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine((quote) => Date.parse(quote.arrivalTo) >= Date.parse(quote.arrivalFrom), "arrivalTo is before arrivalFrom");
const transitionBody = z
  .object({ to: z.enum(["owner_confirmed", "en_route", "on_site", "done", "declined", "cancelled"]), reason: z.string().trim().min(1).max(500) })
  .strict();
const testZukkiBody = z
  .object({
    question: z.string().trim().min(1).max(1000),
    history: z
      .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }).strict())
      .max(10)
      .optional(),
    businessId: z.string().uuid().optional(),
  })
  .strict();

export function ownerRoutes(deps: V1Deps): Hono<OwnerEnv> {
  const app = new Hono<OwnerEnv>();
  app.onError((error, c) => errorResponse(c, error));
  app.use("*", requireOwner(deps.authenticate));
  app.use("*", rateLimit<OwnerEnv>({ limit: 120, windowMs: 60_000, key: (c) => `owner:${c.get("session").userId}`, now: deps.now }));

  app.get("/me", async (c) => ok(c, await owner.getMe(c.get("session"))));

  app.get("/offers", async (c) => {
    const query = readQuery(c, offerQuery);
    return ok(c, await owner.listOffers(c.get("session"), query.status, query.limit));
  });
  app.post("/offers/:id/accept", async (c) => ok(c, await owner.acceptOffer(c.get("session"), readId(c))));
  app.post("/offers/:id/decline", async (c) => {
    const id = readId(c);
    const body = await readJson(c, declineBody);
    return ok(c, await owner.declineOffer(c.get("session"), id, body.reason, body.note));
  });

  app.get("/conversations", async (c) => {
    const query = readQuery(c, z.object({ limit }));
    return ok(c, await owner.listConversations(c.get("session"), query.limit));
  });
  app.get("/conversations/:id/messages", async (c) => {
    const id = readId(c);
    const query = readQuery(c, messagesQuery);
    return ok(c, await owner.listMessages(c.get("session"), id, query.before, query.limit));
  });
  app.post("/conversations/:id/messages", async (c) => {
    const id = readId(c);
    const body = await readJson(c, z.object({ text }).strict());
    return ok(c, await owner.sendMessage(c.get("session"), id, body.text), 201);
  });
  app.post("/conversations/:id/read", async (c) => ok(c, await owner.markRead(c.get("session"), readId(c))));
  app.post("/conversations/:id/drafts", async (c) => {
    const id = readId(c);
    const body = await readJson(c, z.object({ text }).strict());
    return ok(c, await owner.createDraft(c.get("session"), id, body.text, deps), 201);
  });
  app.post("/drafts/:id/send", async (c) => {
    const id = readId(c);
    const body = await readJson(c, z.object({ usePolished: z.boolean() }).strict());
    return ok(c, await owner.sendDraft(c.get("session"), id, body.usePolished), 201);
  });

  app.get("/jobs", async (c) => {
    const query = readQuery(c, z.object({ limit }));
    return ok(c, await owner.listJobs(c.get("session"), query.limit));
  });
  app.get("/jobs/:id", async (c) => ok(c, await owner.getJob(c.get("session"), readId(c))));
  app.post("/jobs/:id/quote", async (c) => {
    const id = readId(c);
    const body = await readJson(c, quoteBody);
    return ok(c, await owner.sendQuote(c.get("session"), id, body), 201);
  });
  app.post("/jobs/:id/transition", async (c) => {
    const id = readId(c);
    const body = await readJson(c, transitionBody);
    return ok(c, await owner.transitionJob(c.get("session"), id, body.to, body.reason));
  });

  app.post("/test-zukki", async (c) => {
    const body = await readJson(c, testZukkiBody);
    return ok(c, await owner.testZukki(c.get("session"), body, deps));
  });

  return app;
}
