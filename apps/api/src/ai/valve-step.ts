// Valve marking (handoff: the circled-valve photo). SAM finds the valve on
// the customer's real frame; our code draws the ring. When SAM is unsure we
// send generic advice instead of pointing at a pipe that may be wrong.
import type { SamBox, SamDetection } from "@owl-hours/meta-models";

export const VALVE_CONCEPT = "shut-off valve";

// Starting point only: tune on real customer videos before the demo.
export const VALVE_CONFIDENCE_THRESHOLD = 0.5;

export const GENERIC_VALVE_ADVICE =
  "I couldn't spot the shut-off valve clearly in your video. It is usually a small handle or knob on the pipe under or behind the fixture. Turn it clockwise until it stops. If you can't find one, the main shut-off is often where the water line enters your home.";

const BOX_PADDING = 0.25;
const MIN_LINE_WIDTH = 4;

export type ValveResult =
  | { kind: "marked"; markedFramePath: string; detection: SamDetection }
  | { kind: "fallback"; advice: string };

export function pickValve(detections: SamDetection[], threshold: number): SamDetection | null {
  return detections.reduce<SamDetection | null>((best, candidate) => {
    if (candidate.confidence === null || candidate.confidence < threshold) {
      return best;
    }
    return best && (best.confidence ?? 0) >= candidate.confidence ? best : candidate;
  }, null);
}

// ffmpeg drawbox filter for a padded ring around the valve, kept in frame.
export function valveOverlayFilter(box: SamBox, frameWidth: number, frameHeight: number): string {
  const padX = Math.round((box.x2 - box.x1) * BOX_PADDING);
  const padY = Math.round((box.y2 - box.y1) * BOX_PADDING);
  const left = Math.max(0, box.x1 - padX);
  const top = Math.max(0, box.y1 - padY);
  const right = Math.min(frameWidth, box.x2 + padX);
  const bottom = Math.min(frameHeight, box.y2 + padY);
  const lineWidth = Math.max(MIN_LINE_WIDTH, Math.round(Math.min(frameWidth, frameHeight) / 80));
  return `drawbox=x=${left}:y=${top}:w=${right - left}:h=${bottom - top}:color=red@0.9:t=${lineWidth}`;
}

export type MarkValveInput = {
  framePath: string;
  imageUrl: string;
  segment: (concept: string, imageUrl: string) => Promise<SamDetection[]>;
  drawOverlay: (framePath: string, filter: string) => Promise<string>;
  threshold?: number;
};

export async function markValve(input: MarkValveInput): Promise<ValveResult> {
  const detections = await input.segment(VALVE_CONCEPT, input.imageUrl);
  const best = pickValve(detections, input.threshold ?? VALVE_CONFIDENCE_THRESHOLD);
  if (!best) {
    return { kind: "fallback", advice: GENERIC_VALVE_ADVICE };
  }
  const filter = valveOverlayFilter(best.box, best.width, best.height);
  const markedFramePath = await input.drawOverlay(input.framePath, filter);
  return { kind: "marked", markedFramePath, detection: best };
}
