import type { Quote } from "../data/types.ts";

const TIME_AND_PERIOD = /^(.+?)\s*(AM|PM)$/i;

// "12:55–1:25 AM": the period is written once when both ends share it.
export function arrivalWindowText({ from, to }: Quote["arrival"]): string {
  const fromParts = TIME_AND_PERIOD.exec(from);
  const toParts = TIME_AND_PERIOD.exec(to);
  const sharePeriod = fromParts && toParts && fromParts[2].toUpperCase() === toParts[2].toUpperCase();

  return sharePeriod ? `${fromParts[1]}–${to}` : `${from}–${to}`;
}
