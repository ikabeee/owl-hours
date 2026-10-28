// Real dependencies from the environment (apps/api/.env.example). A missing
// group of settings turns that part off with a reason that names the
// variables, never their values.
import type { SupabaseClient } from "@supabase/supabase-js";
import { createChatCompletion, createMetaClient } from "@owl-hours/meta-models";
import { createWhatsAppClient, type WhatsAppClient } from "@owl-hours/whatsapp";
import { loadConfig, loadWhatsAppConfig, type ApiConfig, type WhatsAppConfig } from "./config.ts";
import { createServiceClient } from "./db/client.ts";
import { createSupabaseAuthenticator } from "./http/auth.ts";
import type { V1Deps } from "./routes/v1.ts";
import type { WebhookDeps } from "./routes/whatsapp.ts";
import { handleEvents, type Logger } from "./whatsapp/inbound.ts";
import type { OutboxDeps } from "./whatsapp/outbox.ts";
import { createLiveDeps } from "./worker/live-deps.ts";

export type Unavailable = { unavailable: string };
export type LiveDeps = {
  v1: V1Deps | Unavailable;
  whatsapp: WebhookDeps | Unavailable;
  // Set when both the database and WhatsApp are configured.
  outbox: OutboxDeps | null;
};

export function createLiveV1Deps(config: ApiConfig = loadConfig(), whatsapp?: WhatsAppClient): V1Deps {
  const meta = createMetaClient({ apiKey: config.metaModelApiKey });
  return {
    authenticate: createSupabaseAuthenticator(config),
    serviceDb: createServiceClient(config),
    serverKey: config.serverKey,
    chat: (request) => createChatCompletion(meta, request),
    pipeline: createLiveDeps(config),
    ...(whatsapp ? { whatsapp } : {}),
  };
}

export function loadLiveDeps(env: Record<string, string | undefined> = process.env, log: Logger = console): LiveDeps {
  let config: ApiConfig;
  try {
    config = loadConfig(env);
  } catch (error) {
    const reason = reasonOf(error);
    return { v1: { unavailable: reason }, whatsapp: { unavailable: reason }, outbox: null };
  }
  let waConfig: WhatsAppConfig | null = null;
  let waReason = "";
  try {
    waConfig = loadWhatsAppConfig(env);
  } catch (error) {
    waReason = reasonOf(error);
  }
  const client = waConfig
    ? createWhatsAppClient({ accessToken: waConfig.accessToken, phoneNumberId: waConfig.phoneNumberId, graphVersion: waConfig.graphVersion })
    : undefined;
  const v1 = createLiveV1Deps(config, client);
  if (!waConfig || !client) {
    return { v1, whatsapp: { unavailable: waReason }, outbox: null };
  }
  return {
    v1,
    whatsapp: {
      verifyToken: waConfig.verifyToken,
      appSecret: waConfig.appSecret,
      handle: (events) =>
        handleEvents(
          {
            db: v1.serviceDb,
            client,
            storeMedia: (path, bytes, contentType) => uploadMedia(v1.serviceDb, path, bytes, contentType),
            background: (task) => void task(),
            log,
          },
          events,
        ),
      log,
    },
    outbox: { db: v1.serviceDb, client, log },
  };
}

async function uploadMedia(db: SupabaseClient, path: string, bytes: Uint8Array, contentType: string): Promise<void> {
  const { error } = await db.storage.from("media").upload(path, bytes, { contentType, upsert: false });
  if (error) {
    throw new Error(`upload failed: ${error.message}`);
  }
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : "not configured";
}
