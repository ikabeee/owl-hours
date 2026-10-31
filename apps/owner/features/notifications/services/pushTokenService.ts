import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { syncPushToken } from "../lib/pushRegistration.ts";
import type { Session } from "../../../shared/infra/ownerSessionService.ts";

// Push-token plumbing behind the S9 decision (pushRegistration.ts): the Expo
// token from the device, and the sender that upserts it into the owner API's
// push_tokens (user_id, expo_token, platform) for the signed-in owner.
export type PushTokenSender = {
  sendToken: (expoToken: string, platform: "ios" | "android") => Promise<void>;
};

export type PushTokenSenderDeps = {
  baseUrl: string;
  getSessionToken: () => Promise<string>;
  push?: typeof fetch;
};

// The Expo push token, or null when it cannot be issued (no EAS project id in
// the manifest yet, offline, missing credentials): the caller then registers
// nothing. getExpoPushTokenAsync infers the project id from the app manifest,
// so wiring the EAS project id into app.json needs no code change here.
export async function requestExpoPushToken(): Promise<string | null> {
  try {
    return (await Notifications.getExpoPushTokenAsync()).data;
  } catch {
    return null;
  }
}

export function createPushTokenSender(deps: PushTokenSenderDeps): PushTokenSender {
  const push = deps.push ?? fetch;
  return {
    sendToken: (expoToken, platform) => postPushToken({ ...deps, push }, expoToken, platform),
  };
}

// The owner shell runs on iOS and Android; anything else registers as iOS.
export function currentPlatform(): "ios" | "android" {
  return Platform.OS === "android" ? "android" : "ios";
}

// The one call both the onboarding prompt and later launches share: register
// the Expo token when live, sessioned and permitted, otherwise nothing.
export async function registerPushToken(options: {
  session: Session | null;
  configured: boolean;
  permissionGranted: boolean;
  platform: "ios" | "android";
  baseUrl: string;
}): Promise<void> {
  const session = options.session;
  await syncPushToken({
    mode: options.configured ? "live" : "demo",
    hasSession: session !== null,
    permissionGranted: options.permissionGranted,
    platform: options.platform,
    getToken: requestExpoPushToken,
    sendToken: (token) => {
      if (!session) return Promise.resolve();
      return createPushTokenSender({
        baseUrl: options.baseUrl,
        getSessionToken: async () => session.access_token,
      }).sendToken(token, options.platform);
    },
  });
}

async function postPushToken(
  deps: { baseUrl: string; getSessionToken: () => Promise<string>; push: typeof fetch },
  expoToken: string,
  platform: "ios" | "android",
): Promise<void> {
  const sessionToken = await deps.getSessionToken();
  const response = await deps.push(`${deps.baseUrl}/v1/owner/push-tokens`, {
    method: "POST",
    headers: { authorization: `Bearer ${sessionToken}`, "content-type": "application/json" },
    body: JSON.stringify({ expoToken, platform }),
  });
  if (!response.ok) throw new Error(`Push token answered ${response.status}`);
}
