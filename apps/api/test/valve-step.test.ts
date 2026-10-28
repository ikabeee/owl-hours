// Valve marking: pick SAM's best box, draw our own ring on the real frame,
// and fall back to generic advice when SAM is unsure (never guess a valve).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SamDetection } from "@owl-hours/meta-models";
import { GENERIC_VALVE_ADVICE, markValve, pickValve, valveOverlayFilter } from "../src/ai/valve-step.ts";

function detection(objectId: number, confidence: number | null): SamDetection {
  return {
    frame: 0,
    objectId,
    box: { x1: 100, y1: 200, x2: 180, y2: 260 },
    width: 640,
    height: 480,
    confidence,
  };
}

describe("pickValve", () => {
  it("picks the most confident detection above the threshold", () => {
    const best = pickValve([detection(0, 0.6), detection(3, 0.92), detection(5, 0.7)], 0.5);
    assert.equal(best?.objectId, 3);
  });

  it("returns null when every detection is below the threshold", () => {
    assert.equal(pickValve([detection(0, 0.3)], 0.5), null);
  });

  it("returns null when confidence is missing, since we cannot judge it", () => {
    assert.equal(pickValve([detection(0, null)], 0.5), null);
  });

  it("returns null for no detections", () => {
    assert.equal(pickValve([], 0.5), null);
  });
});

describe("valveOverlayFilter", () => {
  it("pads the box and keeps it inside the frame", () => {
    const filter = valveOverlayFilter({ x1: 0, y1: 10, x2: 80, y2: 70 }, 640, 480);
    // 80x60 box padded by 25% each side (20, 15), clamped at the top-left edge.
    assert.equal(filter, "drawbox=x=0:y=0:w=100:h=85:color=red@0.9:t=6");
  });

  it("scales the line width with the frame", () => {
    const filter = valveOverlayFilter({ x1: 400, y1: 400, x2: 600, y2: 600 }, 1920, 1080);
    assert.match(filter, /:t=14$/);
  });
});

describe("markValve", () => {
  it("returns the marked frame when SAM is confident", async () => {
    const drawn: string[] = [];
    const result = await markValve({
      framePath: "frame.jpg",
      imageUrl: "data:image/jpeg;base64,AA",
      segment: async () => [detection(1, 0.88)],
      drawOverlay: async (framePath, filter) => {
        drawn.push(`${framePath}|${filter}`);
        return "frame-marked.jpg";
      },
    });

    assert.equal(result.kind, "marked");
    if (result.kind === "marked") {
      assert.equal(result.markedFramePath, "frame-marked.jpg");
      assert.equal(result.detection.objectId, 1);
    }
    assert.equal(drawn.length, 1);
    assert.match(drawn[0] ?? "", /^frame\.jpg\|drawbox=/);
  });

  it("falls back to generic advice and draws nothing when SAM is unsure", async () => {
    let drew = false;
    const result = await markValve({
      framePath: "frame.jpg",
      imageUrl: "data:x",
      segment: async () => [detection(1, 0.2)],
      drawOverlay: async () => {
        drew = true;
        return "x";
      },
    });

    assert.deepEqual(result, { kind: "fallback", advice: GENERIC_VALVE_ADVICE });
    assert.equal(drew, false);
  });

  it("asks SAM for the shut-off valve concept", async () => {
    const concepts: string[] = [];
    await markValve({
      framePath: "f.jpg",
      imageUrl: "data:x",
      segment: async (concept) => {
        concepts.push(concept);
        return [];
      },
      drawOverlay: async () => "x",
    });
    assert.deepEqual(concepts, ["shut-off valve"]);
  });
});
