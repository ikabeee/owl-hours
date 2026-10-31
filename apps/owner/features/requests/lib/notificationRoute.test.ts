// Spec: odd/tasks/owner-notification-test-zukki.md S3. A pure function maps a
// notification response to a route; app/_layout.tsx owns the handler (including
// the cold-start response). The input is a plain shape ({ actionIdentifier,
// data }) so node tests never import expo-notifications: the default tap is
// the string expo exposes as expo.modules.notifications.actions.DEFAULT.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { routeForNotificationResponse } from "./notificationRoute.ts";

const DEFAULT_ACTION = "expo.modules.notifications.actions.DEFAULT";

describe("routeForNotificationResponse", () => {
  it("maps the default tap to the request", () => {
    assert.equal(
      routeForNotificationResponse({ actionIdentifier: DEFAULT_ACTION, data: { requestId: "req_ana" } }),
      "/request/req_ana",
    );
  });

  it('maps the "Open" action to the request', () => {
    assert.equal(
      routeForNotificationResponse({ actionIdentifier: "open", data: { requestId: "req_ana" } }),
      "/request/req_ana",
    );
  });

  it('maps the "Decline" action to the request with the decline sheet open', () => {
    assert.equal(
      routeForNotificationResponse({ actionIdentifier: "decline", data: { requestId: "req_ana" } }),
      "/request/req_ana?decline=1",
    );
  });

  it("maps a missing or empty request id to no navigation", () => {
    assert.equal(routeForNotificationResponse({ actionIdentifier: DEFAULT_ACTION, data: {} }), null);
    assert.equal(routeForNotificationResponse({ actionIdentifier: DEFAULT_ACTION }), null);
    assert.equal(routeForNotificationResponse({ actionIdentifier: "open", data: { requestId: "" } }), null);
    assert.equal(routeForNotificationResponse({ actionIdentifier: "decline" }), null);
  });
});
