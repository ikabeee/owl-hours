const DEFAULT_PORT = 3000;
const DEFAULT_POLL_MS = 2000;

// OUTBOX_POLL_MS: how often queued WhatsApp messages are sent; 0 turns the
// sender off (for example when another service drains /v1/internal/outbox).
export function readPollMs(value: string | undefined): number {
  if (value === undefined || value.trim() === "") return DEFAULT_POLL_MS;
  const ms = Number(value);
  if (!Number.isInteger(ms) || (ms !== 0 && (ms < 250 || ms > 60_000))) {
    throw new Error(`OUTBOX_POLL_MS must be 0 or a whole number from 250 to 60000, got "${value}"`);
  }
  return ms;
}

// PORT from the environment; unset or blank means the default.
export function readPort(value: string | undefined): number {
  if (value === undefined || value.trim() === "") return DEFAULT_PORT;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`PORT must be a whole number from 1 to 65535, got "${value}"`);
  }
  return port;
}
