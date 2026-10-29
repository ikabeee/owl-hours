import type { ISODate } from "../../../shared/data/types.ts";

const UTC_OFFSET = /(Z|[+-]\d{2}:\d{2})$/;
const MINUTE_MS = 60_000;

// A clock that starts at `startIso` and advances with real time, writing every instant in the start's
// own UTC offset so wall-clock text ("12:06 AM") stays in the demo's time zone.
export function createDemoClock(startIso: ISODate, realNow: () => number = Date.now): () => ISODate {
  const startedAt = realNow();
  const offset = UTC_OFFSET.exec(startIso)?.[1] ?? "Z";
  const offsetMs = offsetInMinutes(offset) * MINUTE_MS;

  return () => {
    const instantMs = Date.parse(startIso) + (realNow() - startedAt);
    return new Date(instantMs + offsetMs).toISOString().replace(/Z$/, offset);
  };
}

function offsetInMinutes(offset: string): number {
  if (offset === "Z") return 0;

  const sign = offset.startsWith("-") ? -1 : 1;
  const [hours, minutes] = offset.slice(1).split(":").map(Number);
  return sign * (hours * 60 + minutes);
}
