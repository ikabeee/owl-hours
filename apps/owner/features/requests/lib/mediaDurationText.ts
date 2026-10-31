import type { Media } from "../../../shared/data/types.ts";
import { formatCountdown } from "./countdown.ts";

// "0:14" for a media item with a known duration, null otherwise.
export function mediaDurationText(media: Media): string | null {
  if (media.kind !== "video" || media.durationS === undefined) return null;

  return formatCountdown(media.durationS);
}
