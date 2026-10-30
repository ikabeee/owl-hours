import { storyPackExportCopys as exportCopy } from "../copys/storyPackExportCopys.ts";
export type StoryPackDelivery = { filename: string; base64: string };
export type NativeDeliveryAdapter = {
  available: () => Promise<boolean>;
  save: (payload: StoryPackDelivery) => Promise<string>;
  share: (uri: string) => Promise<void>;
  remove: (uri: string) => Promise<void>;
};
const MAX_BASE64_LENGTH = Math.ceil((64 * 1024 * 1024) / 3) * 4;
export function encodeStoryPackBytes(bytes: Uint8Array): string {
  if (bytes.length > 64 * 1024 * 1024) throw new Error(exportCopy.sizeLimit);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  }
  return btoa(binary);
}
export function validateStoryPackDelivery(payload: StoryPackDelivery): void {
  if (
    payload.filename !== "zukki-story-pack.zip" ||
    typeof payload.base64 !== "string" ||
    payload.base64.length < 8 ||
    payload.base64.length > MAX_BASE64_LENGTH ||
    payload.base64.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(payload.base64) ||
    !payload.base64.startsWith("UEsDB")
  ) {
    throw new Error(exportCopy.invalidDelivery);
  }
}
export async function deliverNativeStoryPack(
  payload: StoryPackDelivery,
  adapter: NativeDeliveryAdapter,
): Promise<void> {
  validateStoryPackDelivery(payload);
  if (!(await adapter.available()))
    throw new Error(exportCopy.sharingUnavailable);
  const uri = await adapter.save(payload);
  try {
    await adapter.share(uri);
  } finally {
    await adapter.remove(uri);
  }
}
