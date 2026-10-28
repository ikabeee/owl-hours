// Reads a stored photo, video or voice note for the orchestrator: voice is
// transcribed, a frame is taken from video, and SAM marks the shut-off valve
// when the need may be a leak. The download's temp folder is always removed.
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname } from "node:path";
import { imagePart, textPart, type ContentPart } from "@owl-hours/meta-models";
import { describeValve, type PipelineDeps } from "../worker/process-message.ts";
import type { MediaReading, RespondDeps } from "./types.ts";

export const TEMP_PREFIX = "zukki-";

export function createMediaReader(pipeline: PipelineDeps): RespondDeps["readMedia"] {
  return async (input) => {
    const path = await pipeline.downloadMedia(input.mediaId);
    try {
      return await read(pipeline, path, input);
    } finally {
      await removeTempFolder(path);
    }
  };
}

async function read(
  pipeline: PipelineDeps,
  path: string,
  input: Parameters<RespondDeps["readMedia"]>[0],
): Promise<MediaReading> {
  if (input.mediaType === "audio") {
    const transcript = await pipeline.transcribe(await pipeline.toWav(path));
    return {
      parts: [textPart(`Customer voice note (transcribed): ${transcript}`)],
      transcript,
      markedFrameUrl: null,
      valveAdvice: null,
    };
  }
  const framePath = input.mediaType === "video" ? await pipeline.extractFrame(path) : path;
  const imageUrl = await pipeline.toDataUrl(framePath);
  const parts: ContentPart[] = [
    ...(input.caption ? [textPart(`Customer caption: ${input.caption}`)] : []),
    imagePart(imageUrl),
  ];
  if (!input.findValve) {
    return { parts, transcript: null, markedFrameUrl: null, valveAdvice: null };
  }
  const valve = await pipeline.markValve(framePath, imageUrl);
  parts.push(textPart(describeValve(valve)));
  if (valve.kind === "marked") {
    const markedFrameUrl = await pipeline.publishImage(input.conversationId, valve.markedFramePath);
    return { parts, transcript: null, markedFrameUrl, valveAdvice: null };
  }
  return { parts, transcript: null, markedFrameUrl: null, valveAdvice: valve.advice };
}

// Only folders this module's downloads create (os.tmpdir()/zukki-*).
async function removeTempFolder(path: string): Promise<void> {
  const folder = dirname(path);
  if (dirname(folder) === tmpdir() && basename(folder).startsWith(TEMP_PREFIX)) {
    await rm(folder, { recursive: true, force: true });
  }
}
