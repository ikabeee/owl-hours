import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { API_BASE_URL } from "../../../lib/api-client";
import type { Session } from "../../../shared/infra/ownerSessionService.ts";
import { currentPlatform, registerPushToken } from "../services/pushTokenService";

// Later launches with a session send the token again, when permission is granted.
export function usePushTokenSync(options: {
  session: Session | null;
  configured: boolean;
}): void {
  const { session, configured } = options;

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    async function sync(current: Session) {
      const permission = await Notifications.getPermissionsAsync();
      if (cancelled || !permission.granted) return;
      await syncSessionPushToken(current, configured);
    }
    void sync(session);
    return () => {
      cancelled = true;
    };
  }, [session, configured]);
}

async function syncSessionPushToken(session: Session, configured: boolean): Promise<void> {
  await registerPushToken({
    session,
    configured,
    permissionGranted: true,
    platform: currentPlatform(),
    baseUrl: API_BASE_URL,
  });
}
