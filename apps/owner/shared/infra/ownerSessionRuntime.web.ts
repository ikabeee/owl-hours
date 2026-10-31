import { createSupabaseOwnerSession } from './ownerSessionClient.ts';
import { ownerSessionStorage } from './ownerSessionStorage.web.ts';

let runtime: ReturnType<typeof createSupabaseOwnerSession> | undefined;
let runtimeKey: string | undefined;
export function createOwnerSessionRuntime(supabaseUrl: string, anonKey: string) {
  const key = `${supabaseUrl}|${anonKey}`;
  if (runtime && runtimeKey === key) return runtime;
  runtime?.stopRefresh();
  runtimeKey = key;
  // Both platforms exchange callbacks explicitly; web does not race SDK URL detection.
  runtime = createSupabaseOwnerSession({ supabaseUrl, anonKey, storage: ownerSessionStorage,
    detectSessionInUrl: false, autoRefreshToken: true,
    redirectUrl: () => typeof window === 'undefined' ? undefined : `${window.location.origin}/auth/callback` });
  return runtime;
}
