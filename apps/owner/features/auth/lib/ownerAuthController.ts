import { authCopys } from '../copys/authCopys.ts';
import type { Session } from '../../../shared/infra/ownerSessionService.ts';

export type OwnerAuthRuntime = {
  restore(): Promise<Session | null>;
  signIn(email: string): Promise<void>;
  signOut(): Promise<void>;
  subscribe(next: (session: Session | null) => void): () => void;
};

export type OwnerAuthControllerState = {
  session: Session | null;
  loading: boolean;
  error: string | null;
  notice: string | null;
};

export type OwnerAuthController = {
  getState(): OwnerAuthControllerState;
  subscribe(listener: () => void): () => void;
  start(): () => void;
  restore(): Promise<void>;
  signIn(email: string): Promise<void>;
  signOut(): Promise<void>;
  reportError(failure: unknown): void;
};

const safeMessages = new Set<string>(Object.values(authCopys));

function safeError(failure: unknown, fallback: string): string {
  if (failure instanceof Error && safeMessages.has(failure.message)) {
    return failure.message;
  }
  return fallback;
}

export function createOwnerAuthController(runtime: OwnerAuthRuntime | null): OwnerAuthController {
  let state: OwnerAuthControllerState = { session: null, loading: runtime !== null, error: null, notice: null };
  const listeners = new Set<() => void>();
  let unsubscribeRuntime: (() => void) | null = null;
  let signingOut = false;
  let clearedWhileSigningOut = false;
  let liveUpdateReceived = false;

  return { getState, subscribe, start, restore, signIn, signOut, reportError };

  function getState(): OwnerAuthControllerState {
    return state;
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function start(): () => void {
    ensureRuntimeSubscription();
    const current = unsubscribeRuntime;
    let active = true;
    return () => {
      if (active === false) {
        return;
      }
      active = false;
      if (current !== null && unsubscribeRuntime === current) {
        stopRuntimeSubscription();
      }
    };
  }

  function ensureRuntimeSubscription(): void {
    if (runtime === null) {
      return;
    }
    if (unsubscribeRuntime !== null) {
      return;
    }
    unsubscribeRuntime = runtime.subscribe(onSessionChanged);
  }

  function stopRuntimeSubscription(): void {
    if (unsubscribeRuntime === null) {
      return;
    }
    const stop = unsubscribeRuntime;
    unsubscribeRuntime = null;
    stop();
  }

  function onSessionChanged(next: Session | null): void {
    liveUpdateReceived = true;
    if (signingOut && next === null) {
      clearedWhileSigningOut = true;
    }
    if (next === null) {
      update({ session: null, loading: false });
    } else {
      update({ session: next, loading: false, error: null });
    }
  }

  async function restore(): Promise<void> {
    if (runtime === null) {
      update({ loading: false });
      return;
    }
    ensureRuntimeSubscription();
    update({ loading: true, error: null });
    try {
      const next = await runtime.restore();
      if (liveUpdateReceived) {
        update({ loading: false });
        return;
      }
      update({ session: next, loading: false });
    } catch {
      update({ error: authCopys.restoreError, loading: false });
    }
  }

  async function signIn(email: string): Promise<void> {
    if (runtime === null) {
      update({ error: authCopys.unconfigured });
      return;
    }
    ensureRuntimeSubscription();
    update({ loading: true, error: null, notice: null });
    try {
      await runtime.signIn(email);
      update({ notice: authCopys.linkSent, loading: false });
    } catch (failure) {
      update({ error: safeError(failure, authCopys.signInError), loading: false });
    }
  }

  async function signOut(): Promise<void> {
    if (runtime === null) {
      return;
    }
    ensureRuntimeSubscription();
    update({ loading: true, error: null, notice: null });
    signingOut = true;
    clearedWhileSigningOut = false;
    try {
      await runtime.signOut();
      update({ session: null, loading: false });
    } catch (failure) {
      if (clearedWhileSigningOut) {
        update({ session: null, loading: false });
      } else {
        update({ error: safeError(failure, authCopys.signOutError), loading: false });
      }
    } finally {
      signingOut = false;
    }
  }

  function reportError(failure: unknown): void {
    update({ error: safeError(failure, authCopys.callbackError), loading: false });
  }

  function update(patch: Partial<OwnerAuthControllerState>): void {
    state = { ...state, ...patch };
    for (const listener of listeners) {
      listener();
    }
  }
}
