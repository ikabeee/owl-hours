import { useEffect } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import type { NotificationResponse } from "expo-notifications";
import { setupRequestNotifications } from "../lib/notificationSetup";
import { isAlreadyHandled, responseKey } from "../lib/notificationResponseDedupe";
import { routeForNotificationResponse } from "../../requests/lib/notificationRoute";

// The request surface at startup: the category with the Open/Decline actions
// and the high-importance Android channel, plus the response handler
// (including the cold-start response) that opens the tapped request. The
// last-response read is the sync getLastNotificationResponse: the Async
// variant is deprecated (expo-notifications 58,
// https://docs.expo.dev/versions/latest/sdk/notifications/). The listener and
// the cold-start check can fire for the same response, so each response
// identifier navigates once.
// The web build gets no request pushes: expo-notifications has no categories or responses there.
export function useRequestNotifications(): void {
  useEffect(() => {
    if (Platform.OS === "web") return;
    setupRequestNotifications({
      highImportance: Notifications.AndroidImportance.HIGH,
      setCategory: async (identifier, actions) => {
        await Notifications.setNotificationCategoryAsync(identifier, actions);
      },
      // The dep travels as a plain number so the tests run without native
      // modules; the enum is restored at this native boundary.
      setChannel: async (identifier, channel) => {
        if (Platform.OS !== "android") return;
        await Notifications.setNotificationChannelAsync(identifier, {
          name: channel.name,
          importance: channel.importance as Notifications.AndroidImportance,
        });
      },
    });
    const handled: string[] = [];
    const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
      navigateOnceForResponse(handled, response),
    );
    const coldStart = Notifications.getLastNotificationResponse();
    if (coldStart) {
      navigateOnceForResponse(handled, coldStart);
    }
    return () => subscription.remove();
  }, []);
}

function navigateOnceForResponse(handled: string[], response: NotificationResponse): void {
  if (isAlreadyHandled(handled, response)) {
    return;
  }
  handled.push(responseKey(response));
  navigateForResponse(
    response.actionIdentifier,
    response.notification.request.content.data,
  );
}

// A tap (or action) on a request push opens the request; the Decline action
// opens it with the decline sheet open. A response without a request id goes nowhere.
function navigateForResponse(
  actionIdentifier: string,
  data: { requestId?: unknown } | null | undefined,
): void {
  const route = routeForNotificationResponse({ actionIdentifier, data });
  if (route) router.push(route);
}
