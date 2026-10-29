// ffmpeg argument builders. The real binary is not run in unit tests.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractFrameArgs, toWavArgs } from "../src/media/ffmpeg.ts";

describe("ffmpeg args", () => {
  it("extracts one JPEG frame at the given second", () => {
    assert.deepEqual(extractFrameArgs("in.mp4", "out.jpg", 1.5), [
      "-y", "-ss", "1.5", "-i", "in.mp4", "-frames:v", "1", "-q:v", "2", "out.jpg",
    ]);
  });

  it("converts any audio to mono 16-bit 24 kHz WAV for Voice Transcribe", () => {
    assert.deepEqual(toWavArgs("note.ogg", "note.wav"), [
      "-y", "-i", "note.ogg", "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", "-map_metadata", "-1", "note.wav",
    ]);
  });
});
