import type { Media } from "../../../shared/data/types.ts";
import { requestsCopys } from "../copys/requestsCopys.ts";

// What a screen reader announces for the customer's media.
export function mediaAltText(kind: Media["kind"]): string {
  return kind === "video" ? requestsCopys.videoFrameAlt : requestsCopys.photoAlt;
}
