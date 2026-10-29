// Uploads server-made images (the marked frame) to the private media bucket
// and returns a short-lived signed URL, which WhatsApp fetches for the
// image header of payload 04. Path layout: supabase/migrations/*_platform.sql.
// saveMarkedFrame also adds the media row the owner's request card reads
// (public.owner_offers, role 'marked_frame').
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "media";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// WhatsApp downloads the header image when the message is sent; an hour
// covers retries without leaving the photo reachable for long.
export const SIGNED_URL_SECONDS = 3600;

export type PublishedImage = { path: string; url: string };

export function createMediaStore(client: SupabaseClient) {
  async function publishJpeg(conversationId: string, bytes: Uint8Array, name = "marked-frame"): Promise<PublishedImage> {
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
  }

  return {
    publishJpeg,

    async saveMarkedFrame(conversationId: string, sourceMediaId: string, bytes: Uint8Array): Promise<SavedFrame> {
      if (!UUID.test(sourceMediaId)) {
        throw new Error("sourceMediaId must be a uuid");
      }
      const image = await publishJpeg(conversationId, bytes);
      const inserted = await client
        .from("media")
        .insert({
          conversation_id: conversationId,
          kind: "image",
          role: "marked_frame",
          storage_path: image.path,
          mime_type: "image/jpeg",
          size_bytes: bytes.byteLength,
          derived_from_media_id: sourceMediaId,
        })
        .select("id")
        .single();
      if (inserted.error || !inserted.data) {
        throw new Error(`marked frame row failed: ${inserted.error?.message ?? "no row"}`);
      }
      return { ...image, mediaId: String(inserted.data.id) };
    },
  };
}

export type SavedFrame = PublishedImage & { mediaId: string };

export type MediaStore = ReturnType<typeof createMediaStore>;
