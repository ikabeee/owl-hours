const DEFAULT_PORT = 3000;

// PORT from the environment; unset or blank means the default.
export function readPort(value: string | undefined): number {
  if (value === undefined || value.trim() === "") return DEFAULT_PORT;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`PORT must be a whole number from 1 to 65535, got "${value}"`);
  }
  return port;
}
