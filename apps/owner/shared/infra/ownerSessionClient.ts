import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import { createOwnerSessionService } from './ownerSessionService.ts';
import { createOwnerCallbackHandler } from './ownerAuthLifecycle.ts';

export function ownerAuthOptions(options: { storage: SupportedStorage; detectSessionInUrl: boolean; autoRefreshToken?: boolean }) {
  return { storage: options.storage, persistSession: true, flowType: 'pkce' as const,
    autoRefreshToken: options.autoRefreshToken ?? true, detectSessionInUrl: options.detectSessionInUrl };
}
export function createSupabaseOwnerSession(options: {
  supabaseUrl: string; anonKey: string; storage: SupportedStorage;
  detectSessionInUrl: boolean; autoRefreshToken?: boolean; redirectUrl?: () => string | undefined; fetch?: typeof fetch;
}) {
  const client = createClient(options.supabaseUrl, options.anonKey, {
    auth: ownerAuthOptions(options),
    ...(options.fetch ? { global: { fetch: options.fetch } } : {}),
  });
  const session = createOwnerSessionService(client.auth, Date.now, options.redirectUrl);
  let callback: ReturnType<typeof createOwnerCallbackHandler> | undefined;
  return {
    ...session,
    handleCallback: async (url: string) => {
      const redirect = options.redirectUrl?.();
      if (!redirect) return false;
      callback ??= createOwnerCallbackHandler(client.auth, redirect);
      return callback(url);
    },
    startRefresh: () => client.auth.startAutoRefresh(),
    stopRefresh: () => client.auth.stopAutoRefresh(),
  };
}
