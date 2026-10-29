import { wallClockTimeText } from "../../../shared/lib/wallClockTime.ts";

// "Sent by Zukki · 12:05 AM" reads the time Zukki recorded, not the device's zone.
export function sentTimeText(isoTimestamp: string): string | null {
  return wallClockTimeText(isoTimestamp);
}
