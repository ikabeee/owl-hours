// Spec: odd/tasks/owner-notification-test-zukki.md T3 (S4). The app registers the
// request category with the Open and Decline actions, and the high-importance
// Android channel "Urgent requests". Expo deps travel injected so this runs without
// a device; _layout wires the real expo-notifications constants (including
// AndroidImportance.HIGH).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { setupRequestNotifications } from "./notificationSetup.ts";

type CategoryCall = { identifier: string; actions: { identifier: string; buttonTitle: string }[] };
type ChannelCall = { identifier: string; name: string; importance: number };

function recordingDeps() {
  const categories: CategoryCall[] = [];
  const channels: ChannelCall[] = [];
  return {
    categories,
    channels,
    deps: {
      highImportance: 845,
      setCategory: async (identifier: string, actions: CategoryCall["actions"]) => {
        categories.push({ identifier, actions });
      },
      setChannel: async (identifier: string, channel: { name: string; importance: number }) => {
        channels.push({ identifier, ...channel });
      },
    },
  };
}

describe("setupRequestNotifications", () => {
  it("registers the request category with the Open and Decline actions", async () => {
    const { categories, deps } = recordingDeps();

    await setupRequestNotifications(deps);

    assert.deepEqual(categories, [
      {
        identifier: "request",
        actions: [
          { identifier: "open", buttonTitle: "Open" },
          { identifier: "decline", buttonTitle: "Decline" },
        ],
      },
    ]);
  });

  it("creates the high-importance Urgent requests Android channel", async () => {
    const { channels, deps } = recordingDeps();

    await setupRequestNotifications(deps);

    assert.deepEqual(channels, [{ identifier: "urgent-requests", name: "Urgent requests", importance: 845 }]);
  });
});
