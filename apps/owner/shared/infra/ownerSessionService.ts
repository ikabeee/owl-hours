import { authCopys } from '../copys/ownerAuthCopys.ts';

export type Session = {
  access_token: string;
  expires_at?: number;
  user: { id?: string; email?: string };
};
type SessionResult = { data: { session: Session | null }; error: unknown };
export type OwnerAuthPort = {
  getSession(): Promise<SessionResult>;
  refreshSession(): Promise<SessionResult>;
  signInWithOtp(credentials: {
    email: string;
    options: { shouldCreateUser: false; emailRedirectTo?: string };
  }): Promise<{ error: unknown }>;
  signOut(options?: { scope: 'local' }): Promise<{ error: unknown }>;
  onAuthStateChange(callback: (event: string, session: Session | null) => void): {
    data: { subscription: { unsubscribe(): void } };
  };
};

export function createOwnerSessionService(
  auth: OwnerAuthPort,
  now = Date.now,
  redirectUrl: () => string | undefined = () => undefined,
) {
  return {
    async restore(): Promise<Session | null> {
      const result = await auth.getSession();
      if (result.error) throw new Error(authCopys.restoreError);
      return result.data.session;
    },
    async signIn(email: string): Promise<void> {
      const emailRedirectTo = redirectUrl();
      const result = await auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false, ...(emailRedirectTo ? { emailRedirectTo } : {}) },
      });
      if (result.error) throw new Error(authCopys.signInError);
    },
    async signOut(): Promise<void> {
      const { error } = await auth.signOut({ scope: 'local' });
      if (error) throw new Error(authCopys.signOutError);
    },
    async getAccessToken(): Promise<string> {
      let result = await auth.getSession();
      if (result.error || !result.data.session) throw new Error(authCopys.signInRequired);
      if ((result.data.session.expires_at ?? 0) * 1000 <= now() + 60_000) {
        result = await auth.refreshSession();
      }
      if (result.error || !result.data.session || (result.data.session.expires_at ?? 0) * 1000 <= now()) {
        throw new Error(authCopys.sessionExpired);
      }
      return result.data.session.access_token;
    },
    subscribe(callback: (session: Session | null) => void) {
      const { data } = auth.onAuthStateChange((_event, session) => callback(session));
      return () => data.subscription.unsubscribe();
    },
  };
}
export type OwnerSessionService = ReturnType<typeof createOwnerSessionService>;
