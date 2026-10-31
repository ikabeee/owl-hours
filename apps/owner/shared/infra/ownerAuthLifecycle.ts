import { authCopys } from '../copys/ownerAuthCopys.ts';
type Exchange = { exchangeCodeForSession(code: string, options?: { flowId: string }): Promise<{ error: unknown }> };

export function createOwnerCallbackHandler(auth: Exchange, redirectUrl: string) {
  const expected = new URL(redirectUrl);
  const exchanges = new Map<string, Promise<void>>();
  return async (input: string): Promise<boolean> => {
    let url: URL;
    try { url = new URL(input); } catch { return false; }
    if (url.protocol !== expected.protocol || url.host !== expected.host || url.pathname !== expected.pathname || url.username || url.password) return false;
    if (url.searchParams.has('error') || url.hash) throw new Error(authCopys.callbackError);
    const code = url.searchParams.get('code');
    if (!code || url.searchParams.getAll('code').length !== 1) throw new Error(authCopys.callbackError);
    let exchange = exchanges.get(code);
    if (!exchange) {
      exchange = (async () => {
        const flowId = url.searchParams.get('sb_flow_id');
        const result = await auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
        if (result.error) throw new Error(authCopys.callbackError);
      })();
      exchanges.set(code, exchange);
      if (exchanges.size > 20) exchanges.delete(exchanges.keys().next().value!);
    }
    await exchange;
    return true;
  };
}

type Lifecycle = {
  initialUrl(): Promise<string | null>;
  listenUrl(callback: (url: string) => void): () => void;
  listenState(callback: (state: string) => void): () => void;
  currentState(): string | null;
  handleUrl(url: string): Promise<unknown>;
  startRefresh(): void;
  stopRefresh(): void;
  onError(error: Error): void;
};
export function startOwnerAuthLifecycle(options: Lifecycle): () => void {
  let disposed = false;
  const report = (error: unknown) => {
    if (!disposed) options.onError(error instanceof Error ? error : new Error(authCopys.callbackError));
  };
  const receive = (url: string) => { if (!disposed) void options.handleUrl(url).catch(report); };
  const stopUrls = options.listenUrl(receive);
  const update = (state: string | null) => {
    if (disposed) return;
    if (state === 'active') options.startRefresh();
    else options.stopRefresh();
  };
  const stopStates = options.listenState(update);
  update(options.currentState());
  void options.initialUrl().then(url => { if (url) receive(url); }).catch(report);
  return () => {
    disposed = true;
    stopUrls();
    stopStates();
    options.stopRefresh();
  };
}
