const ISO_WALL_CLOCK = /T(\d{2}):(\d{2})/;

// The clock time as Zukki recorded it (the wall clock in the timestamp's own offset), so every
// device shows the same "12:05 AM"; a malformed timestamp gives null instead of "Invalid Date".
export function sentTimeText(isoTimestamp: string): string | null {
  const match = ISO_WALL_CLOCK.exec(isoTimestamp);
  if (!match || Number.isNaN(Date.parse(isoTimestamp))) return null;

  const hours24 = Number(match[1]);
  const minutes = match[2];
  const period = hours24 < 12 ? "AM" : "PM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes} ${period}`;
}
