// Zukki API entry point. Wires routes; run with the serve command below.
import { Hono } from "hono";
import { createStore } from "./store.ts";
import { jobsRoutes } from "./routes/jobs.ts";
import { studioRoutes } from "./routes/studio.ts";
import { voiceRoutes } from "./routes/voice.ts";
import { whatsappRoutes } from "./routes/whatsapp.ts";
import { v1Routes, v1Unavailable, type V1Deps } from "./routes/v1.ts";
import { createLiveV1Deps } from "./v1-live.ts";

// v1 is the real API; without it (no configuration) /v1 answers 503 with
// the reason, and the demo routes below keep working.
export type AppOptions = { v1?: V1Deps | { unavailable: string } | undefined };

export function createApp(options: AppOptions = {}) {
  const store = createStore();
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true }));
  const v1 = options.v1 ?? { unavailable: "The v1 API is not configured on this server." };
  app.route("/v1", "unavailable" in v1 ? v1Unavailable(v1.unavailable) : v1Routes(v1));
  app.route("/jobs", jobsRoutes(store));
  app.route("/webhooks/whatsapp", whatsappRoutes(receiveMessage));
  app.route("/voice", voiceRoutes());
  app.route("/studio", studioRoutes());

  return { app, store };
}

export function receiveMessage(_body: unknown): void {
  // The worker drains this in the next slice; the webhook already answered.
}

function liveV1(): AppOptions["v1"] {
  try {
    return createLiveV1Deps();
  } catch (error) {
    // loadConfig names the missing variables and never their values.
    return { unavailable: error instanceof Error ? error.message : "The v1 API is not configured." };
  }
}

export default createApp({ v1: liveV1() }).app;
