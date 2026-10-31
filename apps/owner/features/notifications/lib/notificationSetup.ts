// Registers the request notification surface: the request category with the
// Open and Decline actions, and the high-importance Android channel
// "Urgent requests". Expo deps travel injected so this runs without a device;
// _layout wires the real expo-notifications constants (AndroidImportance.HIGH).
export type RequestNotificationDeps = {
  highImportance: number;
  setCategory: (identifier: string, actions: { identifier: string; buttonTitle: string }[]) => Promise<void>;
  setChannel: (identifier: string, channel: { name: string; importance: number }) => Promise<void>;
};

export const REQUEST_CATEGORY = "request";
export const OPEN_ACTION = "open";
export const DECLINE_ACTION = "decline";
export const URGENT_CHANNEL = "urgent-requests";
export const URGENT_CHANNEL_NAME = "Urgent requests";

export async function setupRequestNotifications(deps: RequestNotificationDeps): Promise<void> {
  await deps.setCategory(REQUEST_CATEGORY, [
    { identifier: OPEN_ACTION, buttonTitle: "Open" },
    { identifier: DECLINE_ACTION, buttonTitle: "Decline" },
  ]);
  await deps.setChannel(URGENT_CHANNEL, { name: URGENT_CHANNEL_NAME, importance: deps.highImportance });
}
