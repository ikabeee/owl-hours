// Zukki API entry point. Wires routes; run with the serve command below.
import { Hono } from "hono";
import { createStore } from "./store.ts";
import { jobsRoutes } from "./routes/jobs.ts";
import { studioRoutes } from "./routes/studio.ts";
import { voiceRoutes } from "./routes/voice.ts";
import { whatsappRoutes } from "./routes/whatsapp.ts";

export function createApp() {
  const store = createStore();
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true }));
  app.route("/jobs", jobsRoutes(store));
  app.route("/webhooks/whatsapp", whatsappRoutes(receiveMessage));
  app.route("/voice", voiceRoutes());
  app.route("/studio", studioRoutes());

  return { app, store };
}

export function receiveMessage(_body: unknown): void {
  // The worker drains this in the next slice; the webhook already answered.
}

export default createApp().app;
