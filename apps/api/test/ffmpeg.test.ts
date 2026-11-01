// ffmpeg argument builders. The real binary is not run in unit tests.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractFrameArgs, runProcess, toWavArgs } from "../src/media/ffmpeg.ts";

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

describe("runProcess", () => {
  it("kills a process that runs past the timeout", async () => {
    const started = Date.now();
    await assert.rejects(
      runProcess(process.execPath, ["-e", "setTimeout(() => {}, 10000)"], 200),
      /timed out after 200 ms/,
    );
    assert.ok(Date.now() - started < 5000, "did not wait for the process");
  });

  it("reports the end of stderr when the process fails", async () => {
    await assert.rejects(
      runProcess(process.execPath, ["-e", "console.error('bad input'); process.exit(3)"], 5000),
      /bad input/,
    );
  });
});
