// Server-side Supabase client (service_role). Never ship this key to a
// browser or the owner app; those use the signed-in user's session.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ApiConfig } from "../config.ts";

export function createServiceClient(config: Pick<ApiConfig, "supabaseUrl" | "supabaseServiceRoleKey">): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
