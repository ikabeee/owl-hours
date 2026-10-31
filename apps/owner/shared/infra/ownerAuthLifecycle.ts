// Foreground refresh: Supabase refreshes the session only while the app is active.
type Lifecycle = {
  listenState(callback: (state: string) => void): () => void;
  currentState(): string | null;
  startRefresh(): void;
  stopRefresh(): void;
};

export function startOwnerAuthLifecycle(options: Lifecycle): () => void {
  let disposed = false;
  const update = (state: string | null) => {
    if (disposed) return;
    if (state === 'active') options.startRefresh();
    else options.stopRefresh();
  };
  const stopStates = options.listenState(update);
  update(options.currentState());
  return () => {
    disposed = true;
    stopStates();
    options.stopRefresh();
  };
}
