import { Hono } from "hono";
import { whatsappRoutes } from "./routes/whatsapp.ts";
import { v1Routes, v1Unavailable, type V1Deps } from "./routes/v1.ts";
import { createLiveV1Deps } from "./v1-live.ts";

export type AppOptions = { v1?: V1Deps | { unavailable: string } | undefined };

// Public surface: /health, the WhatsApp webhook and /v1 (owner routes need a
// Supabase login, internal routes need the server key). The old in-memory
// /jobs, /voice and /studio demo routes are gone; /v1 replaces them.
export function createApp(options: AppOptions = {}) {
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true }));
  const v1 = options.v1 ?? { unavailable: "The v1 API is not configured on this server." };
  app.route("/v1", "unavailable" in v1 ? v1Unavailable(v1.unavailable) : v1Routes(v1));
  app.route("/webhooks/whatsapp", whatsappRoutes(receiveMessage));

  return { app };
}

export function receiveMessage(_body: unknown): void {
  // The worker drains the queue; that wiring lands in the next slice.
}

// Live dependencies from the environment. A missing variable turns /v1 into
// 503 not_configured instead of crashing the server; the reason names the
// variables, never their values.
export function liveV1(): V1Deps | { unavailable: string } {
  try {
    return createLiveV1Deps();
  } catch (error) {
    return { unavailable: error instanceof Error ? error.message : "The v1 API is not configured." };
  }
}

export default createApp({ v1: liveV1() }).app;
