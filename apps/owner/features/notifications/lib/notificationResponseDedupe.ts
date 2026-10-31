// A cold start can deliver the same notification response twice: once through
// the live listener and once through the last-response check. A response is
// identified by its notification plus the action taken on it (a tap and the
// Decline button on one notification are different responses), so the hook
// handles each identifier once. Pure: no React, no native modules.
export type NotificationResponseLike = {
  actionIdentifier: string;
  notification: { request: { identifier: string } };
};

export function responseKey(response: NotificationResponseLike): string {
  return `${response.actionIdentifier}:${response.notification.request.identifier}`;
}

export function isAlreadyHandled(handledKeys: readonly string[], response: NotificationResponseLike): boolean {
  return handledKeys.includes(responseKey(response));
}
