// Marked-frame geometry: ring around the valve, arrow pointing at it,
// label inside the frame, and real pixels drawn by sharp.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { markupSvg, valveMarkup } from "../src/ai/valve-markup.ts";
import { drawMarkup } from "../src/media/draw-markup.ts";

const W = 640;
const H = 480;

function insideFrame(x: number, y: number) {
  return x >= 0 && x <= W && y >= 0 && y <= H;
}

describe("valveMarkup", () => {
  const box = { x1: 100, y1: 300, x2: 180, y2: 360 };
  const m = valveMarkup(box, W, H);

  it("rings the whole box", () => {
    for (const [x, y] of [[box.x1, box.y1], [box.x2, box.y1], [box.x1, box.y2], [box.x2, box.y2]] as const) {
      assert.ok(Math.hypot(x - m.ring.cx, y - m.ring.cy) <= m.ring.r, `corner ${x},${y} inside the ring`);
    }
  });

  it("points the arrow at the ring from outside it", () => {
    const tip = m.arrow.head[0];
    const tipDistance = Math.hypot(tip.x - m.ring.cx, tip.y - m.ring.cy);
    const tailDistance = Math.hypot(m.arrow.from.x - m.ring.cx, m.arrow.from.y - m.ring.cy);
    assert.ok(tipDistance > m.ring.r && tipDistance < m.ring.r + m.stroke * 2, "tip just outside the ring");
    assert.ok(tailDistance > tipDistance + m.stroke * 4, "tail further out than the tip");
    // Valve is bottom-left, so the arrow comes from the middle of the frame.
    assert.ok(m.arrow.from.x > m.ring.cx && m.arrow.from.y < m.ring.cy);
  });

  it("keeps the arrow and label inside the frame, even for a valve at the edge", () => {
    for (const edge of [valveMarkup({ x1: 0, y1: 0, x2: 40, y2: 30 }, W, H), valveMarkup({ x1: 600, y1: 440, x2: 640, y2: 480 }, W, H), m]) {
      assert.ok(insideFrame(edge.arrow.from.x, edge.arrow.from.y));
      assert.ok(edge.label.x >= 0 && edge.label.x + edge.label.width <= W);
      assert.ok(edge.label.y >= 0 && edge.label.y + edge.label.height <= H);
    }
  });

  it("still draws an arrow when the valve is in the middle of the frame", () => {
    const centred = valveMarkup({ x1: 300, y1: 220, x2: 340, y2: 260 }, W, H);
    assert.ok(centred.arrow.from.x < centred.ring.cx && centred.arrow.from.y < centred.ring.cy, "comes from the top left");
  });

  it("scales line width and text with the frame", () => {
    const big = valveMarkup({ x1: 400, y1: 400, x2: 600, y2: 600 }, 1920, 1080);
    assert.equal(big.stroke, 14);
    assert.equal(big.label.fontSize, 49);
    assert.equal(m.stroke, 6);
  });

  it("escapes the label text in the SVG", () => {
    const svg = markupSvg(valveMarkup(box, W, H, "<b>&"), W, H);
    assert.match(svg, /&lt;b&gt;&amp;/);
    assert.doesNotMatch(svg, /<b>/);
  });

  it("maps SAM's coordinates onto a frame of a different size", () => {
    assert.match(markupSvg(m, W, H, 1280, 960), /width="1280" height="960" viewBox="0 0 640 480"/);
  });
});

describe("drawMarkup", () => {
  it("draws the red ring on the real frame and keeps its size", async () => {
    const dir = await mkdtemp(join(tmpdir(), "zukki-markup-"));
    try {
      const frame = join(dir, "frame.jpg");
      await sharp({ create: { width: W, height: H, channels: 3, background: { r: 200, g: 200, b: 200 } } })
        .jpeg()
        .toFile(frame);
      const m = valveMarkup({ x1: 100, y1: 300, x2: 180, y2: 360 }, W, H);
      const output = await drawMarkup(frame, join(dir, "marked.jpg"), (pw, ph) => markupSvg(m, W, H, pw, ph));

      const { data, info } = await sharp(output).raw().toBuffer({ resolveWithObject: true });
      assert.equal(info.width, W);
      assert.equal(info.height, H);
      const pixel = (x: number, y: number) => {
        const i = (Math.round(y) * info.width + Math.round(x)) * info.channels;
        return { r: data[i] ?? 0, g: data[i + 1] ?? 0, b: data[i + 2] ?? 0 };
      };
      const onRing = pixel(m.ring.cx, m.ring.cy - m.ring.r);
      assert.ok(onRing.r > 180 && onRing.g < 110, `ring pixel is red, got ${JSON.stringify(onRing)}`);
      const untouched = pixel(W - 5, 5);
      assert.ok(Math.abs(untouched.r - 200) < 10 && Math.abs(untouched.g - 200) < 10, "far corner is the original frame");
      const labelCentre = pixel(m.label.x + 4, m.label.y + m.label.height / 2);
      assert.ok(labelCentre.r < 90, "label background is dark");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
