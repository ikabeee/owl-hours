import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getOwnerAuthRuntime, mountOwnerAuth } from '../services/ownerAuthRuntime';
import type { Session } from '../../../shared/infra/ownerSessionService.ts';
import { createOwnerAuthController } from '../lib/ownerAuthController.ts';

type OwnerAuthRuntime = NonNullable<ReturnType<typeof getOwnerAuthRuntime>>;

type AuthState = {
  session: Session | null;
  loading: boolean;
  error: string | null;
  notice: string | null;
  signIn(email: string): Promise<void>;
  signOut(): Promise<void>;
  configured: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function OwnerAuthProvider({ children, runtime }: { children: ReactNode; runtime?: OwnerAuthRuntime | null }) {
  const resolvedRuntime = useMemo(() => runtime ?? getOwnerAuthRuntime(), [runtime]);
  const controller = useMemo(() => createOwnerAuthController(resolvedRuntime), [resolvedRuntime]);
  const [snapshot, setSnapshot] = useState(() => controller.getState());

  useEffect(() => {
    setSnapshot(controller.getState());
    return controller.subscribe(() => {
      setSnapshot(controller.getState());
    });
  }, [controller]);

  useEffect(() => {
    const stop = controller.start();
    void controller.restore();
    return stop;
  }, [controller]);

  useEffect(() => {
    if (resolvedRuntime === null) {
      return;
    }
    return mountOwnerAuth(resolvedRuntime, (failure) => {
      controller.reportError(failure);
    });
  }, [resolvedRuntime, controller]);

  async function signIn(email: string): Promise<void> {
    await controller.signIn(email);
  }

  async function signOut(): Promise<void> {
    await controller.signOut();
  }

  const value: AuthState = {
    session: snapshot.session,
    loading: snapshot.loading,
    error: snapshot.error,
    notice: snapshot.notice,
    signIn,
    signOut,
    configured: resolvedRuntime !== null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useOwnerAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('OwnerAuthProvider is required.');
  }
  return value;
}
