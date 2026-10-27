// Meta Model API client. One base URL, per-model modules on top.
// Confirm exact model IDs and endpoints in the official docs before coding.
export const META_MODEL_BASE_URL = "https://api.meta.ai/v1";

export function requireApiKey(): string {
  const key = process.env.META_MODEL_API_KEY;
  if (!key) {
    throw new Error("Missing META_MODEL_API_KEY");
  }
  return key;
}
