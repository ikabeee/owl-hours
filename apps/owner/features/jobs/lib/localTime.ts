import type { ISODate, Quote } from "../../../shared/data/types.ts";
import { wallClockTimeText } from "../../../shared/lib/wallClockTime.ts";

const DISPLAY_TIME = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

// The API stores instants (often in UTC); the app shows and segments wall-clock times. Writing an
// instant in the device's own offset lets wallClockTimeText and the calendar-day rules read it locally.
export function localIsoString(instant: Date): ISODate {
  const date = `${instant.getFullYear()}-${twoDigits(instant.getMonth() + 1)}-${twoDigits(instant.getDate())}`;
  const time = `${twoDigits(instant.getHours())}:${twoDigits(instant.getMinutes())}:${twoDigits(instant.getSeconds())}`;
  return `${date}T${time}${utcOffset(instant)}`;
}

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

// getTimezoneOffset is minutes behind UTC, so UTC-5 answers 300.
function utcOffset(instant: Date): string {
  const minutesAhead = -instant.getTimezoneOffset();
  const sign = minutesAhead < 0 ? "-" : "+";
  const absolute = Math.abs(minutesAhead);
  return `${sign}${twoDigits(Math.floor(absolute / 60))}:${twoDigits(absolute % 60)}`;
}

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}
