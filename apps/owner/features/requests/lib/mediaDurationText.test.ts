// Spec: odd/tasks/owner-ui-build.md, T3.1, L27; design OwRequest.dc.html shows "Video · 0:14".
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Media } from "../../../shared/data/types.ts";
import { mediaDurationText } from "./mediaDurationText.ts";

const video = (durationS: number): Media => ({ kind: "video", url: "bath-leak-video", thumbUrl: "bath-leak", durationS });
const videoWithoutDuration: Media = { kind: "video", url: "bath-leak-video", thumbUrl: "bath-leak" };

describe("mediaDurationText", () => {
  it("writes a 14 second video as 0:14", () => {
    assert.equal(mediaDurationText(video(14)), "0:14");
  });

  it("writes minutes and zero-padded seconds past a minute", () => {
    assert.equal(mediaDurationText(video(75)), "1:15");
  });

  it("is null for a video without a known duration", () => {
    assert.equal(mediaDurationText(videoWithoutDuration), null);
  });

  it("is null for a photo", () => {
    assert.equal(mediaDurationText({ kind: "photo", url: "leak", thumbUrl: "leak" }), null);
  });
});
