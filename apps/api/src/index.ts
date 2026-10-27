// Zukki API (Node + Hono). Webhook answers 200 immediately and
// processes video/voice/model calls asynchronously in the worker.
import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

// WhatsApp Cloud API webhook verification (GET) and receiver (POST).
// Full verification + async queue lands in the next slice.
app.get("/webhooks/whatsapp", (c) => c.text("todo: verify"));
app.post("/webhooks/whatsapp", async (c) => c.json({ received: true }));

export default app;
