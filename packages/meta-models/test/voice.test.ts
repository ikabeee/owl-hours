// Muse Voice Transcribe batch request (docs: dev.meta.ai/docs/api-reference/voice/transcribe).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMetaClient } from "../src/client.ts";
import { transcribeWav } from "../src/voice.ts";
import { fakeFetch, jsonResponse } from "./fake-fetch.ts";

describe("transcribeWav", () => {
  it("sends the WAV as multipart with the transcription settings", async () => {
    const fetch = fakeFetch(() =>
      jsonResponse({ sessionId: "s1", transcript: "Water everywhere, help", audioDurationMs: 3100, turns: [] }),
    );
    const client = createMetaClient({ apiKey: "k", fetch: fetch.fn });

    const result = await transcribeWav(client, new Uint8Array([82, 73, 70, 70]), {
      languageBias: ["English", "Spanish"],
    });

    assert.equal(result.transcript, "Water everywhere, help");
    assert.equal(result.durationMs, 3100);
    const call = fetch.calls[0];
    assert.equal(call?.url, "https://api.meta.ai/v1/asr/transcribe");
    assert.equal(call?.headers.accept, "application/json");
    const settings = JSON.parse(await (call?.form?.get("request") as Blob).text());
    assert.deepEqual(settings, {
      model: "muse-voice-transcribe-1.0",
      audioEncoding: "WAV",
      mode: "PUSH_TO_TALK",
      languageBias: ["English", "Spanish"],
    });
    assert.ok(call?.form?.get("audio") instanceof Blob);
  });
});
