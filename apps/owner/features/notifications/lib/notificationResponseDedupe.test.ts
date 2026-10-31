// Spec: odd/tasks/owner-notification-test-zukki.md T4 (S3). The cold-start
// last-response check and the live listener can fire for the same response:
// the second handling is dropped. The decision is pure: the same response
// identifier is handled once.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isAlreadyHandled, responseKey } from "./notificationResponseDedupe.ts";

function tap(identifier: string, actionIdentifier = "open") {
  return { actionIdentifier, notification: { request: { identifier } } };
}

describe("notification response dedupe", () => {
  it("handles the same response identifier once", () => {
    const response = tap("notif-1");

    assert.equal(isAlreadyHandled([], response), false);
    assert.equal(isAlreadyHandled([responseKey(response)], response), true);
  });

  it("treats another action on the same notification as a different response", () => {
    const handled = [responseKey(tap("notif-1", "open"))];

    assert.equal(isAlreadyHandled(handled, tap("notif-1", "decline")), false);
  });

  it("treats another notification as a different response", () => {
    const handled = [responseKey(tap("notif-1"))];

    assert.equal(isAlreadyHandled(handled, tap("notif-2")), false);
  });
});
