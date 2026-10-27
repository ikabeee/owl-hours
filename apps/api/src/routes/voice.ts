// Voice endpoint. Transcription runs through Muse Voice Transcribe in
// the worker; this route only receives the owner's hands-free replies.
import { Hono } from "hono";

export function voiceRoutes(): Hono {
  const routes = new Hono();

  routes.post("/transcribe", (c) => c.json({ error: "voice transcribe not wired" }, 501));

  return routes;
}
