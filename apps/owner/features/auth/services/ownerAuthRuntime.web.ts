import { createOwnerSessionRuntime } from '../../../shared/infra/ownerSessionRuntime.web.ts';
import { startOwnerAuthLifecycle } from '../../../shared/infra/ownerAuthLifecycle.ts';

export function getOwnerAuthRuntime() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createOwnerSessionRuntime(url, key);
}
export function mountOwnerAuth(runtime: NonNullable<ReturnType<typeof getOwnerAuthRuntime>>, onError: (error: Error) => void) {
  if (typeof window === 'undefined') return () => undefined;
  return startOwnerAuthLifecycle({
    initialUrl: async () => window.location.pathname === '/auth/callback' ? window.location.href : null,
    listenUrl: callback => {
      const listener = () => { if (window.location.pathname === '/auth/callback') callback(window.location.href); };
      window.addEventListener('popstate', listener);
      return () => window.removeEventListener('popstate', listener);
    },
    listenState: callback => {
      const listener = () => callback(document.visibilityState === 'visible' ? 'active' : 'background');
      document.addEventListener('visibilitychange', listener);
      return () => document.removeEventListener('visibilitychange', listener);
    },
    currentState: () => document.visibilityState === 'visible' ? 'active' : 'background',
    handleUrl: async url => {
      const handled = await runtime.handleCallback(url);
      if (handled) window.history.replaceState(null, '', '/auth/callback');
    },
    startRefresh: runtime.startRefresh,
    stopRefresh: runtime.stopRefresh,
    onError,
  });
}
