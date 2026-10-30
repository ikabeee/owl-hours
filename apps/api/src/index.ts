import { ownerCors } from "./http/owner-cors.ts";
import { Hono } from "hono";
import { whatsappRoutes, whatsappUnavailable, type WebhookDeps } from "./routes/whatsapp.ts";
import { v1Routes, v1Unavailable, type V1Deps } from "./routes/v1.ts";
import type { Unavailable } from "./v1-live.ts";

export type AppOptions = {
  ownerAppOrigins?: readonly string[];
  ownerPublicOrigin?: string | undefined;
  v1?: V1Deps | Unavailable | undefined;
  whatsapp?: WebhookDeps | Unavailable | undefined;
};

// Public surface: /health, the WhatsApp webhook (signed by Meta) and /v1
// (owner routes need a Supabase login, internal routes need the server key).
export function createApp(options: AppOptions = {}) {
  const app = new Hono();
  app.use("/v1/owner/*", ownerCors(options.ownerAppOrigins ?? [], options.ownerPublicOrigin));

  app.get("/health", (c) => c.json({ ok: true }));
  const v1 = options.v1 ?? { unavailable: "The v1 API is not configured on this server." };
  app.route("/v1", "unavailable" in v1 ? v1Unavailable(v1.unavailable) : v1Routes(v1));
  const whatsapp = options.whatsapp ?? { unavailable: "WhatsApp is not configured on this server." };
  app.route("/webhooks/whatsapp", "unavailable" in whatsapp ? whatsappUnavailable(whatsapp.unavailable) : whatsappRoutes(whatsapp));

  return { app };
}
