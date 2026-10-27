// Async pipeline for one inbound WhatsApp message. Each step maps to a
// Meta Model API call; every step below is unwired until its slice lands.
export async function downloadMedia(_mediaId: string): Promise<string> {
  throw new Error("todo: fetch media URL with token, store in Supabase Storage");
}

export async function transcribeVoice(_audioPath: string): Promise<string> {
  throw new Error("todo: Muse Voice Transcribe over WebSocket");
}

export async function segmentFrame(
  _framePath: string,
  _prompt: "shut-off valve" | "fill valve" | "water puddle",
): Promise<unknown> {
  throw new Error("todo: SAM 3.1 text-prompted masks/boxes");
}

export async function runCustomerAgent(_input: unknown): Promise<unknown> {
  throw new Error("todo: Muse Spark agent with tools");
}

export async function processMessage(_message: unknown): Promise<void> {
  throw new Error("todo: download -> transcribe -> SAM -> Spark agent");
}
