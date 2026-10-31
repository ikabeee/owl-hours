// Spec: odd/tasks/owner-notification-test-zukki.md T4 (S11). Sign-out deletes
// this device's token before the session ends, best-effort: a failure never
// blocks sign-out, and a missing token deletes nothing.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { forgetDevicePushToken } from "./pushDeregistration.ts";

describe("forgetDevicePushToken", () => {
  it("deletes the current device token", async () => {
    const deleted: string[] = [];

    await forgetDevicePushToken({
      getToken: async () => "ExponentPushToken[abc123]",
      deleteToken: async (token) => {
        deleted.push(token);
      },
    });

    assert.deepEqual(deleted, ["ExponentPushToken[abc123]"]);
  });

  it("resolves when the delete fails, so sign-out is never blocked", async () => {
    let called = false;

    await forgetDevicePushToken({
      getToken: async () => "ExponentPushToken[abc123]",
      deleteToken: async () => {
        called = true;
        throw new Error("network down");
      },
    });

    assert.equal(called, true);
  });

  it("deletes nothing when no token is available", async () => {
    let called = false;

    await forgetDevicePushToken({
      getToken: async () => null,
      deleteToken: async () => {
        called = true;
      },
    });

    assert.equal(called, false);
  });
});
