import { useCallback } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { API_BASE_URL } from "../../../lib/api-client";
import type { Session } from "../../../shared/infra/ownerSessionService.ts";
import { currentPlatform, registerPushToken } from "../services/pushTokenService";

// "Allow notifications" asks the OS for permission; when granted and the owner
// has a session, the Expo push token is sent to the owner API. Demo mode asks
// for permission but registers nothing.
export function useAllowNotifications(options: {
  session: Session | null;
  configured: boolean;
}): () => Promise<void> {
  const { session, configured } = options;

  return useCallback(async function allowNotifications(): Promise<void> {
    // Expo push tokens exist only on phones; on the web the step just moves on.
    if (Platform.OS === "web") return;
    const permission = await Notifications.requestPermissionsAsync();
    await registerPushToken({
      session,
      configured,
      permissionGranted: permission.granted,
      platform: currentPlatform(),
      baseUrl: API_BASE_URL,
    });
  }, [session, configured]);
}
