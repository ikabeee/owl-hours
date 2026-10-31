import { AppState } from 'react-native';
import { createOwnerSessionRuntime } from '../../../shared/infra/ownerSessionRuntime';
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
  return startOwnerAuthLifecycle({
    listenState: callback => { const listener = AppState.addEventListener('change', callback); return () => listener.remove(); },
    currentState: () => AppState.currentState ?? null,
    startRefresh: runtime.startRefresh,
    stopRefresh: runtime.stopRefresh,
  });
}
