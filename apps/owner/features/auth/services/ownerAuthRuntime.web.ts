import { createOwnerSessionRuntime } from '../../../shared/infra/ownerSessionRuntime.web.ts';
import { startOwnerAuthLifecycle } from '../../../shared/infra/ownerAuthLifecycle.ts';

export type OwnerAuthRuntime = ReturnType<typeof createOwnerSessionRuntime>;

// Live mode needs both public Supabase variables; without them the app runs the demo.
export function getOwnerAuthRuntime(): OwnerAuthRuntime | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createOwnerSessionRuntime(url, key);
}

export function mountOwnerAuth(runtime: OwnerAuthRuntime): () => void {
  if (typeof window === 'undefined') return () => undefined;
  return startOwnerAuthLifecycle({
    listenState: callback => {
      const listener = () => callback(visibility());
      document.addEventListener('visibilitychange', listener);
      return () => document.removeEventListener('visibilitychange', listener);
    },
    currentState: visibility,
    startRefresh: runtime.startRefresh,
    stopRefresh: runtime.stopRefresh,
  });
}

function visibility(): string {
  return document.visibilityState === 'visible' ? 'active' : 'background';
}
