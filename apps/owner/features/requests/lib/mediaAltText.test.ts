// L32 follow-up 2: a photo is not announced as a frame from a video.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mediaAltText } from "./mediaAltText.ts";

describe("mediaAltText", () => {
  it("describes a video thumbnail as a frame from the customer's video", () => {
    assert.equal(mediaAltText("video"), "Frame from the customer's video");
  });

  it("describes a photo as the customer's photo", () => {
    assert.equal(mediaAltText("photo"), "Photo from the customer");
  });
});
