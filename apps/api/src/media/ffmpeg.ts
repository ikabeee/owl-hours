// ffmpeg wrappers for the media steps. Arg builders are pure so they can
// be tested without the binary; runFfmpeg needs ffmpeg on PATH (or
// FFMPEG_PATH).
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function extractFrameArgs(input: string, output: string, atSeconds: number): string[] {
  return ["-y", "-ss", String(atSeconds), "-i", input, "-frames:v", "1", "-q:v", "2", output];
}

// Voice Transcribe wants mono 16-bit PCM WAV at 16 or 24 kHz.
export function toWavArgs(input: string, output: string): string[] {
  return ["-y", "-i", input, "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", "-map_metadata", "-1", output];
}

export function overlayArgs(input: string, filter: string, output: string): string[] {
  return ["-y", "-i", input, "-vf", filter, "-q:v", "2", output];
}

export async function runFfmpeg(args: string[], bin = process.env.FFMPEG_PATH ?? "ffmpeg"): Promise<void> {
  try {
    await execFileAsync(bin, ["-hide_banner", "-loglevel", "error", ...args], { windowsHide: true });
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr?.trim().slice(-500) ?? "";
    throw new Error(`ffmpeg failed (${args.at(-1) ?? "no output"}): ${stderr || String(error)}`);
  }
}
