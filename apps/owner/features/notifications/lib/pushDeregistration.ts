// Sign-out push cleanup (S11 tenant isolation): a shared phone keeps no other
// business's pushes. The current device token is deleted before the session
// ends; the delete is best-effort and never blocks sign-out. Deps are injected
// so this runs without a device; the auth hook wires the real Expo token and
// API sender.
export type PushDeregistrationInput = {
  getToken: () => Promise<string | null>;
  deleteToken: (token: string) => Promise<void>;
};

export async function forgetDevicePushToken(input: PushDeregistrationInput): Promise<void> {
  const token = await input.getToken().catch(() => null);
  if (!token) return;
  await input.deleteToken(token).catch(() => {});
}
