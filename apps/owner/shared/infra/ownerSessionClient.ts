import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import { createOwnerSessionService } from './ownerSessionService.ts';

export function ownerAuthOptions(options: { storage: SupportedStorage; detectSessionInUrl: boolean; autoRefreshToken?: boolean }) {
  return { storage: options.storage, persistSession: true, flowType: 'pkce' as const,
    autoRefreshToken: options.autoRefreshToken ?? true, detectSessionInUrl: options.detectSessionInUrl };
}
export function createSupabaseOwnerSession(options: {
  supabaseUrl: string; anonKey: string; storage: SupportedStorage;
  detectSessionInUrl: boolean; autoRefreshToken?: boolean; fetch?: typeof fetch;
}) {
  const client = createClient(options.supabaseUrl, options.anonKey, {
    auth: ownerAuthOptions(options),
    ...(options.fetch ? { global: { fetch: options.fetch } } : {}),
  });
  return {
    ...createOwnerSessionService(client.auth),
    startRefresh: () => client.auth.startAutoRefresh(),
    stopRefresh: () => client.auth.stopAutoRefresh(),
  };
}
