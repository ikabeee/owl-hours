import { AppState, Linking } from 'react-native';
import { createOwnerSessionRuntime } from '../../../shared/infra/ownerSessionRuntime';
import { startOwnerAuthLifecycle } from '../../../shared/infra/ownerAuthLifecycle.ts';

export function getOwnerAuthRuntime() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createOwnerSessionRuntime(url, key);
}
export function mountOwnerAuth(runtime: NonNullable<ReturnType<typeof getOwnerAuthRuntime>>, onError: (error: Error) => void) {
  return startOwnerAuthLifecycle({
    initialUrl: async () => (await Linking.getInitialURL()) ?? null,
    listenUrl: callback => { const listener = Linking.addEventListener('url', event => callback(event.url)); return () => listener.remove(); },
    listenState: callback => { const listener = AppState.addEventListener('change', callback); return () => listener.remove(); },
    currentState: () => AppState.currentState ?? null,
    handleUrl: runtime.handleCallback,
    startRefresh: runtime.startRefresh,
    stopRefresh: runtime.stopRefresh,
    onError,
  });
}
