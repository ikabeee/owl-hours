// L30 follow-up 2: media that is not a demo frame must not render a blank banner.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mediaFrameSource } from "./mediaFrameSource.ts";

const demoFrames = { "bath-leak": "data:image/svg+xml;base64,AAA" };

describe("mediaFrameSource", () => {
  it("resolves a demo id to its embedded frame", () => {
    assert.equal(mediaFrameSource("bath-leak", demoFrames), "data:image/svg+xml;base64,AAA");
  });

  it("keeps a real https URL as it is", () => {
    assert.equal(mediaFrameSource("https://cdn.example.com/f/1.jpg", demoFrames), "https://cdn.example.com/f/1.jpg");
  });

  it("keeps a data URI as it is", () => {
    assert.equal(mediaFrameSource("data:image/png;base64,BBB", demoFrames), "data:image/png;base64,BBB");
  });

  it("returns null for an id with no frame, so no blank banner is drawn", () => {
    assert.equal(mediaFrameSource("unknown-id", demoFrames), null);
  });
});
