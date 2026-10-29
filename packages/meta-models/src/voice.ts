// Muse Voice Transcribe, batch mode (POST /asr/transcribe, multipart).
// Audio must be mono 16-bit PCM WAV at 16 or 24 kHz; WhatsApp voice notes
// are OGG/Opus, so convert first (see apps/api/src/media/ffmpeg.ts).
import { z } from "zod";
import type { MetaClient } from "./client.ts";

export const VOICE_MODEL = "muse-voice-transcribe-1.0";

export type TranscribeOptions = {
  // Language names the speaker is likely to use, e.g. ["English", "Spanish"].
  languageBias?: string[];
};

export type Transcription = { sessionId: string; transcript: string; durationMs: number };

const transcriptionSchema = z.object({
  sessionId: z.string(),
  transcript: z.string(),
  audioDurationMs: z.number(),
});

export async function transcribeWav(
  client: MetaClient,
  wav: Uint8Array<ArrayBuffer>,
  options: TranscribeOptions = {},
): Promise<Transcription> {
  const settings = {
    model: VOICE_MODEL,
    audioEncoding: "WAV",
    mode: "PUSH_TO_TALK",
    ...(options.languageBias ? { languageBias: options.languageBias } : {}),
  };
  const form = new FormData();
  form.append("request", new Blob([JSON.stringify(settings)], { type: "application/json" }));
  form.append("audio", new Blob([wav], { type: "audio/wav" }), "audio.wav");

  const response = await client.post("/asr/transcribe", form, { accept: "application/json" });
  const parsed = transcriptionSchema.parse(await response.json());
  return { sessionId: parsed.sessionId, transcript: parsed.transcript, durationMs: parsed.audioDurationMs };
}
