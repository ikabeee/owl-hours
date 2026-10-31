import { createSupabaseOwnerSession } from './ownerSessionClient.ts';
import { ownerSessionStorage } from './ownerSessionStorage';

let runtime: ReturnType<typeof createSupabaseOwnerSession> | undefined;
let runtimeKey: string | undefined;
export function createOwnerSessionRuntime(supabaseUrl: string, anonKey: string) {
  const key = `${supabaseUrl}|${anonKey}`;
  if (runtime && runtimeKey === key) return runtime;
  runtime?.stopRefresh();
  runtimeKey = key;
  runtime = createSupabaseOwnerSession({ supabaseUrl, anonKey, storage: ownerSessionStorage,
    detectSessionInUrl: false, autoRefreshToken: false });
  return runtime;
}
