// Real dependencies for /v1, from the environment (apps/api/.env.example).
import { createChatCompletion, createMetaClient } from "@owl-hours/meta-models";
import { loadConfig, type ApiConfig } from "./config.ts";
import { createServiceClient } from "./db/client.ts";
import { createSupabaseAuthenticator } from "./http/auth.ts";
import type { V1Deps } from "./routes/v1.ts";
import { createLiveDeps } from "./worker/live-deps.ts";

export function createLiveV1Deps(config: ApiConfig = loadConfig()): V1Deps {
  const meta = createMetaClient({ apiKey: config.metaModelApiKey });
  return {
    authenticate: createSupabaseAuthenticator(config),
    serviceDb: createServiceClient(config),
    serverKey: config.serverKey,
    chat: (request) => createChatCompletion(meta, request),
    pipeline: createLiveDeps(config),
  };
}
