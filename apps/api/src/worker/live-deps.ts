// Real pipeline steps: Meta Model API (Spark, SAM 3.1, Voice Transcribe),
// ffmpeg, sharp (marked frame) and Supabase (data + storage). Settings come from loadConfig() (apps/api/.env.example).
// Media comes from the private bucket, where the webhook stored it.
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { z } from "zod";
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
import { TEMP_PREFIX } from "../orchestrator/media.ts";
import { unwrap } from "../services/db-result.ts";
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
    // mediaId is our media row (public.media.id). Each download gets its own
    // temp folder; orchestrator/media.ts removes it when the turn is done.
    downloadMedia: async (mediaId) => {
      const row = z
        .object({ storage_path: z.string() })
        .parse(unwrap(await supabase.from("media").select("storage_path").eq("id", mediaId).single()));
      const { data, error } = await supabase.storage.from("media").download(row.storage_path);
      if (error || !data) {
        throw new Error(`media ${mediaId} download failed: ${error?.message ?? "no data"}`);
      }
      const path = join(await mkdtemp(join(tmpdir(), TEMP_PREFIX)), basename(row.storage_path));
      await writeFile(path, new Uint8Array(await data.arrayBuffer()));
      return path;
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
    publishImage: async (conversationId, imagePath, sourceMediaId) => {
      const bytes = await readFile(imagePath);
      const image = sourceMediaId
        ? await mediaStore.saveMarkedFrame(conversationId, sourceMediaId, bytes)
        : await mediaStore.publishJpeg(conversationId, bytes);
      return image.url;
    },
    runAgent: (messages, conversationId) =>
      runAgent({
        chat: (request) => createChatCompletion(client, request),
        tools: createAgentTools({ conversationId, repo }),
        messages,
      }),
  };
}
