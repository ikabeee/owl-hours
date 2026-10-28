// API settings from the environment, checked once at startup. Errors name
// the variables that are wrong and never echo their values.
import { z } from "zod";

const envSchema = z.object({
  META_MODEL_API_KEY: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(30),
  SUPABASE_ANON_KEY: z.string().min(30),
  ZUKKI_SERVER_KEY: z.string().min(32),
});

export type ApiConfig = {
  metaModelApiKey: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseAnonKey: string;
  serverKey: string;
};

export function loadConfig(env: Record<string, string | undefined> = process.env): ApiConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(`Missing or invalid environment variables: ${names.join(", ")} (see apps/api/.env.example)`);
  }
  return {
    metaModelApiKey: parsed.data.META_MODEL_API_KEY,
    supabaseUrl: parsed.data.SUPABASE_URL,
    supabaseServiceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
    supabaseAnonKey: parsed.data.SUPABASE_ANON_KEY,
    serverKey: parsed.data.ZUKKI_SERVER_KEY,
  };
}
