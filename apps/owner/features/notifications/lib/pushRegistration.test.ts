// Spec: odd/tasks/owner-notification-test-zukki.md T4 (S9). The push-token decision:
// in live mode with a session and granted permission the token is sent to the owner
// endpoint; demo mode and denied permission register nothing. Deps are injected so
// this runs without a device; the route wires the real OS permission, Expo push
// token, and API client.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { syncPushToken } from "./pushRegistration.ts";

type SyncInput = Parameters<typeof syncPushToken>[0];

function recordingDeps(overrides: Partial<SyncInput> = {}) {
  const calls: { name: string; token?: string }[] = [];
  const input: SyncInput = {
    mode: "live",
    hasSession: true,
    permissionGranted: true,
    platform: "ios",
    getToken: async () => {
      calls.push({ name: "getToken" });
      return "ExponentPushToken[abc123]";
    },
    sendToken: async (token: string) => {
      calls.push({ name: "sendToken", token });
    },
    ...overrides,
  };
  return { calls, input };
}

describe("syncPushToken", () => {
  it("sends the Expo token in live mode with a session and granted permission", async () => {
    const { calls, input } = recordingDeps();

    const result = await syncPushToken(input);

    assert.equal(result, "registered");
    assert.deepEqual(calls, [{ name: "getToken" }, { name: "sendToken", token: "ExponentPushToken[abc123]" }]);
  });

  it("registers nothing in demo mode", async () => {
    const { calls, input } = recordingDeps({ mode: "demo" });

    assert.equal(await syncPushToken(input), "skipped");
    assert.deepEqual(calls, []);
  });

  it("registers nothing when permission is denied", async () => {
    const { calls, input } = recordingDeps({ permissionGranted: false });

    assert.equal(await syncPushToken(input), "skipped");
    assert.deepEqual(calls, []);
  });

  it("registers nothing without a session", async () => {
    const { calls, input } = recordingDeps({ hasSession: false });

    assert.equal(await syncPushToken(input), "skipped");
    assert.deepEqual(calls, []);
  });

  it("sends nothing when no token is available", async () => {
    const { calls, input } = recordingDeps({ getToken: async () => null });

    assert.equal(await syncPushToken(input), "skipped");
    assert.deepEqual(
      calls.filter((call) => call.name === "sendToken"),
      [],
    );
  });
});
