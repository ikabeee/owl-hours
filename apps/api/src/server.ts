// Starts the API on PORT (default 3000). The npm scripts pass
// --env-file-if-exists=.env so the keys come from apps/api/.env locally;
// in a deployment they come from the host's environment.
import { serve } from "@hono/node-server";
import { createApp, liveV1 } from "./index.ts";
import { readPort } from "./port.ts";

const SHUTDOWN_GRACE_MS = 10_000;

function main(): void {
  const port = readPort(process.env.PORT);
  const v1 = liveV1();
  if ("unavailable" in v1) {
    console.warn(`v1 API disabled (every /v1 call returns 503): ${v1.unavailable}`);
  }
  const { app } = createApp({ v1 });
  const server = serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Zukki API listening on port ${info.port}`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, closing the server`);
    // Stop taking new connections, let in-flight requests finish, then exit.
    // If something hangs, exit anyway after the grace period.
    setTimeout(() => process.exit(1), SHUTDOWN_GRACE_MS).unref();
    server.close((error) => {
      if (error) console.error("Server did not close cleanly", error);
      process.exit(error ? 1 : 0);
    });
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

main();
