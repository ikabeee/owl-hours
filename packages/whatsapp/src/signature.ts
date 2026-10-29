// Meta signs each webhook POST with the app secret:
// X-Hub-Signature-256: sha256=<hex HMAC-SHA256 of the raw body>.
import { createHmac, timingSafeEqual } from "node:crypto";

export const SIGNATURE_HEADER = "x-hub-signature-256";
const FORMAT = /^sha256=([0-9a-f]{64})$/i;

export function verifySignature(appSecret: string, rawBody: string, header: string | undefined | null): boolean {
  const given = FORMAT.exec(header ?? "")?.[1];
  if (!given || appSecret.length === 0) {
    return false;
  }
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();
  return timingSafeEqual(Buffer.from(given.toLowerCase(), "hex"), expected);
}
