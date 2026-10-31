// The push-token decision: in live mode with a session and granted permission
// the Expo token is sent to the owner endpoint; demo mode, denied permission,
// a missing session or a missing token register nothing. Deps are injected so
// this runs without a device; the route wires the real OS permission, Expo
// push token and API client.
export type PushRegistrationInput = {
  mode: "live" | "demo";
  hasSession: boolean;
  permissionGranted: boolean;
  platform: "ios" | "android";
  getToken: () => Promise<string | null>;
  sendToken: (token: string) => Promise<void>;
};

export type PushRegistrationResult = "registered" | "skipped";

export async function syncPushToken(input: PushRegistrationInput): Promise<PushRegistrationResult> {
  if (input.mode !== "live") return "skipped";
  if (!input.hasSession) return "skipped";
  if (!input.permissionGranted) return "skipped";

  const token = await input.getToken();
  if (!token) return "skipped";

  await input.sendToken(token);
  return "registered";
}
