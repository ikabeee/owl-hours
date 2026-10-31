// The app's one owner session: the root provider restores it, keeps it refreshed in the
// foreground, and hands the emailed-code send/verify to onboarding. Demo mode has no runtime.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getOwnerAuthRuntime, mountOwnerAuth, type OwnerAuthRuntime } from '../services/ownerAuthRuntime';
import type { Session } from '../../../shared/infra/ownerSessionService.ts';
import { createOwnerAuthController } from '../lib/ownerAuthController.ts';

// The emailed-code send/verify; null in demo mode, where onboarding keeps its fake.
export type OwnerCodeAuth = {
  sendCode(email: string): Promise<boolean>;
  verifyCode(email: string, code: string): Promise<boolean>;
};

export type OwnerAuthState = {
  configured: boolean;
  session: Session | null;
  loading: boolean;
  error: string | null;
  codeAuth: OwnerCodeAuth | null;
  signOut(): Promise<void>;
};

const AuthContext = createContext<OwnerAuthState | null>(null);

type ProviderProps = { children: ReactNode; runtime?: OwnerAuthRuntime | null };

export function OwnerAuthProvider({ children, runtime }: ProviderProps) {
  const resolvedRuntime = useMemo(() => runtime ?? getOwnerAuthRuntime(), [runtime]);
  const controller = useMemo(() => createOwnerAuthController(resolvedRuntime), [resolvedRuntime]);
  const [snapshot, setSnapshot] = useState(() => controller.getState());
  const codeAuth = useMemo(() => codeAuthOf(resolvedRuntime, controller), [resolvedRuntime, controller]);

  useEffect(() => {
    setSnapshot(controller.getState());
    return controller.subscribe(() => setSnapshot(controller.getState()));
  }, [controller]);

  useEffect(() => {
    const stop = controller.start();
    void controller.restore();
    return stop;
  }, [controller]);

  useEffect(() => {
    if (resolvedRuntime === null) return;
    return mountOwnerAuth(resolvedRuntime);
  }, [resolvedRuntime]);

  const value: OwnerAuthState = {
    configured: resolvedRuntime !== null,
    session: snapshot.session,
    loading: snapshot.loading,
    error: snapshot.error,
    codeAuth,
    signOut: controller.signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function codeAuthOf(runtime: OwnerAuthRuntime | null, controller: OwnerCodeAuth): OwnerCodeAuth | null {
  if (runtime === null) return null;
  return { sendCode: controller.sendCode, verifyCode: controller.verifyCode };
}

export function useOwnerAuth(): OwnerAuthState {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('OwnerAuthProvider is required.');
  }
  return value;
}
