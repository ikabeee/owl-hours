// Where a notification response sends the owner. The default tap and the
// "Open" action open the request; the "Decline" action opens it with the
// decline sheet open (?decline=1, S2). app/_layout.tsx owns the handler,
// including the cold-start response; this module owns the mapping, so it runs
// without expo-notifications: the default tap is the string expo exposes as
// expo.modules.notifications.actions.DEFAULT.
export type NotificationResponseInput = {
  actionIdentifier: string;
  data?: { requestId?: unknown } | null | undefined;
};

const DEFAULT_ACTION = "expo.modules.notifications.actions.DEFAULT";
const OPEN_ACTION = "open";
const DECLINE_ACTION = "decline";

export function routeForNotificationResponse(response: NotificationResponseInput): string | null {
  const requestId = requestIdOf(response.data);
  if (!requestId) return null;

  if (response.actionIdentifier === DECLINE_ACTION) return `/request/${requestId}?decline=1`;
  if (response.actionIdentifier === DEFAULT_ACTION || response.actionIdentifier === OPEN_ACTION) {
    return `/request/${requestId}`;
  }
  return null;
}

function requestIdOf(data: NotificationResponseInput["data"]): string | null {
  if (typeof data?.requestId !== "string") return null;

  const trimmed = data.requestId.trim();
  return trimmed === "" ? null : trimmed;
}
