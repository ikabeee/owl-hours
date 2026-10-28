// Starts the API on PORT (default 3000). The npm scripts pass
// --env-file-if-exists=.env so the keys come from apps/api/.env locally;
// in a deployment they come from the host's environment.
import { serve } from "@hono/node-server";
import { createApp } from "./index.ts";
import { readPort, readPollMs } from "./port.ts";
import { loadLiveDeps } from "./v1-live.ts";
import { startOutboxLoop } from "./whatsapp/outbox-loop.ts";

const SHUTDOWN_GRACE_MS = 10_000;

function main(): void {
  const port = readPort(process.env.PORT);
  const pollMs = readPollMs(process.env.OUTBOX_POLL_MS);
  const live = loadLiveDeps();
  if ("unavailable" in live.v1) {
    console.warn(`v1 API disabled (every /v1 call returns 503): ${live.v1.unavailable}`);
  }
  if ("unavailable" in live.whatsapp) {
    console.warn(`WhatsApp disabled (webhook returns 503, nothing is sent): ${live.whatsapp.unavailable}`);
  }
  const { app } = createApp({ v1: live.v1, whatsapp: live.whatsapp });
  const server = serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Zukki API listening on port ${info.port}`);
  });
  const outbox = live.outbox && pollMs > 0 ? startOutboxLoop(live.outbox, pollMs) : null;
  if (outbox) {
    console.log(`Sending queued WhatsApp messages every ${pollMs} ms`);
  }

  const shutdown = (signal: string) => {
    console.log(`${signal} received, closing the server`);
    // Stop taking new connections, let in-flight requests finish, then exit.
    // If something hangs, exit anyway after the grace period.
    setTimeout(() => process.exit(1), SHUTDOWN_GRACE_MS).unref();
    void outbox?.stop();
    server.close((error) => {
      if (error) console.error("Server did not close cleanly", error);
      process.exit(error ? 1 : 0);
    });
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

main();
