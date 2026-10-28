// Real pipeline steps: Meta Model API (Spark, SAM 3.1, Voice Transcribe),
// ffmpeg, sharp (marked frame) and Supabase (data + storage). Settings come from loadConfig() (apps/api/.env.example).
// WhatsApp media download is still a stub until the WhatsApp slice lands.
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { createChatCompletion, createMetaClient, segmentImage, transcribeWav } from "@owl-hours/meta-models";
import { markValve } from "../ai/valve-step.ts";
import { runAgent } from "../agent/run-agent.ts";
import { createAgentTools } from "../agent/tools.ts";
import { loadConfig, type ApiConfig } from "../config.ts";
import { createServiceClient } from "../db/client.ts";
import { createSupabaseRepository } from "../db/repository.ts";
import { drawMarkup } from "../media/draw-markup.ts";
import { extractFrameArgs, runFfmpeg, toWavArgs } from "../media/ffmpeg.ts";
import { createMediaStore } from "../media/media-store.ts";
import type { PipelineDeps } from "./process-message.ts";

// A second in skips the blurry first frame most phone videos start with.
const FRAME_AT_SECONDS = 1;

function withSuffix(path: string, suffix: string): string {
  const extension = extname(path);
  return `${extension ? path.slice(0, -extension.length) : path}${suffix}`;
}

export function createLiveDeps(config: ApiConfig = loadConfig()): PipelineDeps {
  const client = createMetaClient({ apiKey: config.metaModelApiKey });
  const supabase = createServiceClient(config);
  const repo = createSupabaseRepository(supabase);
  const mediaStore = createMediaStore(supabase);

  return {
    downloadMedia: async () => {
      throw new Error("todo: WhatsApp media download (GET /{media-id} with the access token)");
    },
    toWav: async (audioPath) => {
      const output = withSuffix(audioPath, ".wav");
      await runFfmpeg(toWavArgs(audioPath, output));
      return output;
    },
    transcribe: async (wavPath) => {
      const result = await transcribeWav(client, await readFile(wavPath));
      return result.transcript;
    },
    extractFrame: async (videoPath) => {
      const output = withSuffix(videoPath, "-frame.jpg");
      try {
        await runFfmpeg(extractFrameArgs(videoPath, output, FRAME_AT_SECONDS));
      } catch {
        // Clips shorter than FRAME_AT_SECONDS: take the first frame instead.
        await runFfmpeg(extractFrameArgs(videoPath, output, 0));
      }
      return output;
    },
    toDataUrl: async (imagePath) => `data:image/jpeg;base64,${(await readFile(imagePath)).toString("base64")}`,
    markValve: (framePath, imageUrl) =>
      markValve({
        framePath,
        imageUrl,
        segment: (concept, url) => segmentImage(client, { concept, imageUrl: url }),
        drawOverlay: (frame, svgFor) => drawMarkup(frame, withSuffix(frame, "-valve.jpg"), svgFor),
      }),
    publishImage: async (conversationId, imagePath) =>
      (await mediaStore.publishJpeg(conversationId, await readFile(imagePath))).url,
    runAgent: (messages, conversationId) =>
      runAgent({
        chat: (request) => createChatCompletion(client, request),
        tools: createAgentTools({ conversationId, repo }),
        messages,
      }),
  };
}
