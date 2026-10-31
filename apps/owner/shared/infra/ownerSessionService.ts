// The owner's Supabase session: emailed 6-digit code sign-in, restore, sign-out and the
// API token. Email OTP: https://supabase.com/docs/guides/auth/auth-email-passwordless
import { authCopys } from '../copys/ownerAuthCopys.ts';

export type Session = {
  access_token: string;
  expires_at?: number;
  user: { id?: string; email?: string; phone?: string };
};
type SessionResult = { data: { session: Session | null }; error: unknown };
export type OwnerAuthPort = {
  getSession(): Promise<SessionResult>;
  refreshSession(): Promise<SessionResult>;
  signInWithOtp(credentials: { email: string; options: { shouldCreateUser: true } }): Promise<{ error: unknown }>;
  verifyOtp(params: { email: string; token: string; type: 'email' }): Promise<{ error: unknown }>;
  signOut(options?: { scope: 'local' }): Promise<{ error: unknown }>;
  onAuthStateChange(callback: (event: string, session: Session | null) => void): {
    data: { subscription: { unsubscribe(): void } };
  };
};

export function createOwnerSessionService(auth: OwnerAuthPort, now = Date.now) {
  return {
    async restore(): Promise<Session | null> {
      const result = await auth.getSession();
      if (result.error) throw new Error(authCopys.restoreError);
      return result.data.session;
    },
    // Sign-up creates the owner's auth user on the first code (shouldCreateUser).
    async sendCode(email: string): Promise<boolean> {
      const { error } = await auth.signInWithOtp({
        email: normalizeEmail(email),
        options: { shouldCreateUser: true },
      });
      return !error;
    },
    // A verified code stores the session through the client's storage and emits it.
    async verifyCode(email: string, code: string): Promise<boolean> {
      const { error } = await auth.verifyOtp({ email: normalizeEmail(email), token: code, type: 'email' });
      return !error;
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

// Supabase matches the email exactly; the form allows surrounding spaces and casing.
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
