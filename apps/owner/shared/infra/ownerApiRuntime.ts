import { createOwnerApi, resolveOwnerApiConfig, type OwnerApi } from './ownerApi.ts';
import { createOwnerSessionRuntime } from './ownerSessionRuntime';

// Composition root for the live owner API: null means the app runs the demo.
// It shares the signed-in session with the auth provider (same runtime key).
export function getOwnerLiveApi(): OwnerApi | null {
  const config = resolveOwnerApiConfig({
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (config.mode === 'demo') return null;
  const session = createOwnerSessionRuntime(config.supabaseUrl, config.anonKey);
  return createOwnerApi({ apiUrl: config.apiUrl, getAccessToken: session.getAccessToken });
}
