// Cloud API client: POST /{phone-number-id}/messages to send, GET /{media-id}
// then the returned URL to download. Errors carry Meta's code and message,
// never the access token.
import { z } from "zod";

export const DEFAULT_GRAPH_VERSION = "v23.0";
const GRAPH_HOST = "https://graph.facebook.com";
const TIMEOUT_MS = 15_000;
// The media bucket's limit; WhatsApp itself caps video at 16 MB.
const MAX_MEDIA_BYTES = 100 * 1024 * 1024;
// Media URLs come back on lookaside.fbsbx.com today; the others are Meta CDNs.
const META_MEDIA_HOSTS = [".fbsbx.com", ".facebook.com", ".fbcdn.net", ".whatsapp.net"];

export type WhatsAppClientConfig = {
  accessToken: string;
  phoneNumberId: string;
  graphVersion?: string | undefined;
  fetch?: typeof fetch | undefined;
};

// The Cloud API message body without messaging_product, which send() adds.
export type OutgoingMessage = { to: string; type: string } & Record<string, unknown>;
export type ReplyButton = { id: string; title: string };
export type MediaInfo = { url: string; mimeType: string; sizeBytes: number | null };

export class WhatsAppApiError extends Error {
  readonly status: number;
  readonly code: number | null;
  constructor(status: number, code: number | null, message: string) {
    super(message);
    this.name = "WhatsAppApiError";
    this.status = status;
    this.code = code;
  }
}

const sendResponse = z.object({ messages: z.array(z.object({ id: z.string().min(1) })).min(1) });
const mediaResponse = z.object({
  url: z.string().url(),
  mime_type: z.string().min(1),
  file_size: z.coerce.number().int().nonnegative().optional(),
});
const errorBody = z.object({
  error: z.object({ message: z.string().optional(), code: z.number().optional() }).passthrough(),
});

export function createWhatsAppClient(config: WhatsAppClientConfig) {
  const doFetch = config.fetch ?? fetch;
  const version = config.graphVersion ?? DEFAULT_GRAPH_VERSION;
  const auth = { Authorization: `Bearer ${config.accessToken}` };

  async function call(url: string, init: RequestInit): Promise<Response> {
    const res = await doFetch(url, {
      ...init,
      headers: { ...auth, ...(init.headers as Record<string, string> | undefined) },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      throw await toError(res);
    }
    return res;
  }

  return {
    // Returns WhatsApp's message id (wamid).
    async send(message: OutgoingMessage): Promise<string> {
      const res = await call(`${GRAPH_HOST}/${version}/${encodeURIComponent(config.phoneNumberId)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...message }),
      });
      const [first] = sendResponse.parse(await res.json()).messages;
      return first!.id;
    },

    // The download URL is short-lived and needs the same token.
    async getMedia(mediaId: string): Promise<MediaInfo> {
      const res = await call(`${GRAPH_HOST}/${version}/${encodeURIComponent(mediaId)}`, { method: "GET" });
      const body = mediaResponse.parse(await res.json());
      return { url: body.url, mimeType: body.mime_type, sizeBytes: body.file_size ?? null };
    },

    async download(url: string): Promise<Uint8Array> {
      // Only ever send the token to Meta's own hosts.
      const host = new URL(url).hostname;
      if (!META_MEDIA_HOSTS.some((suffix) => host === suffix.slice(1) || host.endsWith(suffix))) {
        throw new Error(`refusing to download media from ${host}`);
      }
      const res = await call(url, { method: "GET" });
      const declared = Number(res.headers.get("content-length") ?? "0");
      if (declared > MAX_MEDIA_BYTES) {
        throw new Error(`media is ${declared} bytes, over the ${MAX_MEDIA_BYTES} limit`);
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength > MAX_MEDIA_BYTES) {
        throw new Error(`media is ${bytes.byteLength} bytes, over the ${MAX_MEDIA_BYTES} limit`);
      }
      return bytes;
    },
  };
}

export type WhatsAppClient = ReturnType<typeof createWhatsAppClient>;

async function toError(res: Response): Promise<WhatsAppApiError> {
  const parsed = errorBody.safeParse(await res.json().catch(() => null));
  const message = parsed.success ? (parsed.data.error.message ?? "no message") : "no error body";
  const code = parsed.success ? (parsed.data.error.code ?? null) : null;
  return new WhatsAppApiError(res.status, code, `WhatsApp API ${res.status}${code === null ? "" : ` (code ${code})`}: ${message}`);
}

// Payload 11-style plain text. WhatsApp's limit is 4096 characters.
export function textMessage(to: string, body: string): OutgoingMessage {
  return { to, type: "text", text: { preview_url: false, body } };
}

// Reply buttons (payloads 12 and 13): body up to 1024 characters, 1-3
// buttons with titles up to 20, footer up to 60.
export function buttonMessage(
  to: string,
  content: { body: string; buttons: ReplyButton[]; footer?: string | undefined; headerText?: string | undefined },
): OutgoingMessage {
  const interactive: Record<string, unknown> = {
    type: "button",
    body: { text: content.body },
    action: { buttons: content.buttons.map((reply) => ({ type: "reply", reply })) },
  };
  if (content.footer) interactive.footer = { text: content.footer };
  if (content.headerText) interactive.header = { type: "text", text: content.headerText };
  return { to, type: "interactive", interactive };
}
