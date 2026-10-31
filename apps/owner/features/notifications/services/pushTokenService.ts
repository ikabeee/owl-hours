import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { postPushToken, deletePushToken } from "../lib/pushTokenApi.ts";
import { syncPushToken } from "../lib/pushRegistration.ts";
import type { Session } from "../../../shared/infra/ownerSessionService.ts";

// Push-token plumbing behind the S9 decision (pushRegistration.ts): the Expo
// token from the device, and the sender that upserts it into the owner API's
// push_tokens (user_id, expo_token, platform) for the signed-in owner, and
// deletes it again on sign-out so a shared phone keeps no other business's pushes.
export type PushTokenSender = {
  sendToken: (expoToken: string, platform: "ios" | "android") => Promise<void>;
  deleteToken: (expoToken: string) => Promise<void>;
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
  const api = { ...deps, push };
  return {
    sendToken: (expoToken, platform) => postPushToken(api, expoToken, platform),
    deleteToken: (expoToken) => deletePushToken(api, expoToken),
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

