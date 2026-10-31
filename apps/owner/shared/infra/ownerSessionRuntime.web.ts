import { createSupabaseOwnerSession } from './ownerSessionClient.ts';
import { ownerSessionStorage } from './ownerSessionStorage.web.ts';

let runtime: ReturnType<typeof createSupabaseOwnerSession> | undefined;
let runtimeKey: string | undefined;
export function createOwnerSessionRuntime(supabaseUrl: string, anonKey: string) {
  const key = `${supabaseUrl}|${anonKey}`;
  if (runtime && runtimeKey === key) return runtime;
  runtime?.stopRefresh();
  runtimeKey = key;
  // Email OTP sign-in never returns through a URL, so the SDK does not read one.
  runtime = createSupabaseOwnerSession({ supabaseUrl, anonKey, storage: ownerSessionStorage,
    detectSessionInUrl: false, autoRefreshToken: true });
  return runtime;
}
