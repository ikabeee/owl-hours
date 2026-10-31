import { authCopys } from '../copys/authCopys.ts';
import type { Session } from '../../../shared/infra/ownerSessionService.ts';

export type OwnerAuthRuntime = {
  restore(): Promise<Session | null>;
  sendCode(phone: string): Promise<boolean>;
  verifyCode(phone: string, code: string): Promise<boolean>;
  signOut(): Promise<void>;
  subscribe(next: (session: Session | null) => void): () => void;
};

export type OwnerAuthControllerState = {
  session: Session | null;
  loading: boolean;
  error: string | null;
};

export type OwnerAuthController = {
  getState(): OwnerAuthControllerState;
  subscribe(listener: () => void): () => void;
  start(): () => void;
  restore(): Promise<void>;
  sendCode(phone: string): Promise<boolean>;
  verifyCode(phone: string, code: string): Promise<boolean>;
  signOut(): Promise<void>;
};

const safeMessages = new Set<string>(Object.values(authCopys));

// Network failures read as a rejected send or code: the handoff has no other copy.
async function answerOrFalse(attempt: () => Promise<boolean>): Promise<boolean> {
  try {
    return await attempt();
  } catch {
    return false;
  }
}

function safeError(failure: unknown, fallback: string): string {
  if (failure instanceof Error && safeMessages.has(failure.message)) {
    return failure.message;
  }
  return fallback;
}

export function createOwnerAuthController(runtime: OwnerAuthRuntime | null): OwnerAuthController {
  let state: OwnerAuthControllerState = { session: null, loading: runtime !== null, error: null };
  const listeners = new Set<() => void>();
  let unsubscribeRuntime: (() => void) | null = null;
  let signingOut = false;
  let clearedWhileSigningOut = false;
  let liveUpdateReceived = false;

  return { getState, subscribe, start, restore, sendCode, verifyCode, signOut };

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

  // Demo mode has no runtime: onboarding then uses its DEMO_CODE fake, never this.
  async function sendCode(phone: string): Promise<boolean> {
    if (runtime === null) {
      return false;
    }
    return answerOrFalse(() => runtime.sendCode(phone));
  }

  // Subscribe first, so the session the runtime emits on a verified code is kept.
  async function verifyCode(phone: string, code: string): Promise<boolean> {
    if (runtime === null) {
      return false;
    }
    ensureRuntimeSubscription();
    return answerOrFalse(() => runtime.verifyCode(phone, code));
  }

  async function signOut(): Promise<void> {
    if (runtime === null) {
      return;
    }
    ensureRuntimeSubscription();
    update({ loading: true, error: null });
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

  function update(patch: Partial<OwnerAuthControllerState>): void {
    state = { ...state, ...patch };
    for (const listener of listeners) {
      listener();
    }
  }
}
