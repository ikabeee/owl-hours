// Runs each conversation's tasks one at a time, in arrival order, so a
// video and the voice note right after it never get answered out of order
// or twice. Different conversations run in parallel. In-process only: one
// server instance.
import { errorText, type Logger } from "../whatsapp/inbound.ts";

export function createSerializer(log: Pick<Logger, "error">) {
  const tails = new Map<string, Promise<void>>();
  return function run(key: string, task: () => Promise<void>): Promise<void> {
    const previous = tails.get(key) ?? Promise.resolve();
    const next = previous.then(task).catch((error: unknown) => {
      log.error(`zukki: task for ${key} failed: ${errorText(error)}`);
    });
    tails.set(key, next);
    void next.finally(() => {
      if (tails.get(key) === next) tails.delete(key);
    });
    return next;
  };
}
