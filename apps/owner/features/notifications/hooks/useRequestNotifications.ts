import { useEffect } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { setupRequestNotifications } from "../lib/notificationSetup";
import { routeForNotificationResponse } from "../../requests/lib/notificationRoute";

// The request surface at startup: the category with the Open/Decline actions
// and the high-importance Android channel, plus the response handler
// (including the cold-start response) that opens the tapped request.
export function useRequestNotifications(): void {
  useEffect(() => {
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
    const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
      navigateForResponse(
        response.actionIdentifier,
        response.notification.request.content.data,
      ),
    );
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        navigateForResponse(
          response.actionIdentifier,
          response.notification.request.content.data,
        );
      }
    });
    return () => subscription.remove();
  }, []);
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
