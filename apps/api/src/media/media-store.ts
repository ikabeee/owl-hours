// Uploads server-made images (the marked frame) to the private media bucket
// and returns a short-lived signed URL, which WhatsApp fetches for the
// image header of payload 04. Path layout: supabase/migrations/*_platform.sql.
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "media";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// WhatsApp downloads the header image when the message is sent; an hour
// covers retries without leaving the photo reachable for long.
export const SIGNED_URL_SECONDS = 3600;

export type PublishedImage = { path: string; url: string };

export function createMediaStore(client: SupabaseClient) {
  return {
    async publishJpeg(conversationId: string, bytes: Uint8Array, name = "marked-frame"): Promise<PublishedImage> {
      if (!UUID.test(conversationId)) {
        throw new Error("conversationId must be a uuid");
      }
      const path = `conversations/${conversationId}/${name}-${randomUUID()}.jpg`;
      const bucket = client.storage.from(BUCKET);
      const uploaded = await bucket.upload(path, bytes, { contentType: "image/jpeg", upsert: false });
      if (uploaded.error) {
        throw new Error(`upload failed: ${uploaded.error.message}`);
      }
      const signed = await bucket.createSignedUrl(path, SIGNED_URL_SECONDS);
      if (signed.error || !signed.data?.signedUrl) {
        throw new Error(`signed url failed: ${signed.error?.message ?? "no url"}`);
      }
      return { path, url: signed.data.signedUrl };
    },
  };
}

export type MediaStore = ReturnType<typeof createMediaStore>;
