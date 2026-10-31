import type { ISODate, Quote } from "../../../shared/data/types.ts";
import { localIsoString } from "../../../shared/lib/localIsoString.ts";
import { wallClockTimeText } from "../../../shared/lib/wallClockTime.ts";

const DISPLAY_TIME = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

// "12:55 AM" for an API timestamp, on the device's clock; null when the timestamp is malformed.
export function localClockText(isoTimestamp: string): string | null {
  const instant = new Date(isoTimestamp);
  return Number.isNaN(instant.getTime()) ? null : wallClockTimeText(localIsoString(instant));
}

// The quote's display window ("11:50 PM"–"12:20 AM") as instants on `day` in the device zone; the end
// rolls to the next day when it reads earlier than the start. Null when either end is not a display time.
export function arrivalInstants(arrival: Quote["arrival"], day: Date): { from: ISODate; to: ISODate } | null {
  const from = atDisplayTime(day, arrival.from);
  const to = atDisplayTime(day, arrival.to);
  if (!from || !to) return null;

  if (to.getTime() < from.getTime()) to.setDate(to.getDate() + 1);
  return { from: localIsoString(from), to: localIsoString(to) };
}

function atDisplayTime(day: Date, displayTime: string): Date | null {
  const match = DISPLAY_TIME.exec(displayTime.trim());
  if (!match) return null;

  const instant = new Date(day);
  instant.setHours(hours24(Number(match[1]), match[3]), Number(match[2]), 0, 0);
  return instant;
}

function hours24(hours12: number, period: string): number {
  const isAfternoon = period.toUpperCase() === "PM";
  return (hours12 % 12) + (isAfternoon ? 12 : 0);
}

