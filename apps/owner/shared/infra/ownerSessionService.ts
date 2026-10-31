// The owner's Supabase session: SMS one-time code sign-in, restore, sign-out and the
// API token. Phone OTP: https://supabase.com/docs/guides/auth/phone-login
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
  signInWithOtp(credentials: { phone: string; options: { shouldCreateUser: true } }): Promise<{ error: unknown }>;
  verifyOtp(params: { phone: string; token: string; type: 'sms' }): Promise<{ error: unknown }>;
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
    async sendCode(phone: string): Promise<boolean> {
      const { error } = await auth.signInWithOtp({
        phone: toE164(phone),
        options: { shouldCreateUser: true },
      });
      return !error;
    },
    // A verified code stores the session through the client's storage and emits it.
    async verifyCode(phone: string, code: string): Promise<boolean> {
      const { error } = await auth.verifyOtp({ phone: toE164(phone), token: code, type: 'sms' });
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

// The sign-up form allows spaces and dashes ("+1 555 014 2290"); Supabase wants E.164.
function toE164(phone: string): string {
  return phone.replace(/[\s-]/g, '');
}
