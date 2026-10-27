// WhatsApp Cloud API webhook. Answers 200 immediately and processes
// asynchronously: WhatsApp retries slow webhooks, and video plus several
// model calls takes seconds.
import { Hono } from "hono";

export function whatsappRoutes(onMessage: (body: unknown) => void): Hono {
  const routes = new Hono();

  routes.get("/", (c) => {
    const mode = c.req.query("hub.mode");
    const token = c.req.query("hub.verify_token");
    const challenge = c.req.query("hub.challenge") ?? "";
    const ok = mode === "subscribe" && token !== undefined && token === process.env.WHATSAPP_VERIFY_TOKEN;
    return ok ? c.text(challenge) : c.json({ error: "forbidden" }, 403);
  });

  routes.post("/", async (c) => {
    onMessage(await c.req.json().catch(() => null));
    return c.json({ received: true });
  });

  return routes;
}
