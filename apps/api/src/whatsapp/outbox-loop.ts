// Drains the outbox on a timer. One drain at a time; a failing drain is
// logged and retried on the next tick.
import { errorText } from "./inbound.ts";
import { drainOutbox, type OutboxDeps } from "./outbox.ts";

export function startOutboxLoop(deps: OutboxDeps, intervalMs: number) {
  let running: Promise<void> | null = null;
  const tick = () => {
    if (running) return;
    running = drainOutbox(deps)
      .then(({ sent, failed }) => {
        if (sent + failed > 0) deps.log.info(`whatsapp: outbox sent ${sent}, failed ${failed}`);
      })
      .catch((error: unknown) => deps.log.error(`whatsapp: outbox drain failed: ${errorText(error)}`))
      .finally(() => {
        running = null;
      });
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref();
  return {
    tick,
    async stop(): Promise<void> {
      clearInterval(timer);
      await running;
    },
  };
}
