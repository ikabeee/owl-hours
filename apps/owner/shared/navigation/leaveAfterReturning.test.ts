// L21: a DOM action that navigates must return before the screen unmounts, or
// Expo's DOM bridge emits the action result into a WebView that no longer exists
// ("Unable to find the 'DomWebView' view with tag").
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { leaveAfterReturning } from "./leaveAfterReturning.ts";

describe("leaveAfterReturning", () => {
  beforeEach(() => mock.timers.enable({ apis: ["setTimeout"] }));
  afterEach(() => mock.timers.reset());

  it("does not navigate while the action is still returning", () => {
    const navigate = mock.fn();

    leaveAfterReturning(navigate);

    assert.equal(navigate.mock.callCount(), 0);
  });

  it("navigates once on the next macrotask", () => {
    const navigate = mock.fn();

    leaveAfterReturning(navigate);
    mock.timers.tick(0);

    assert.equal(navigate.mock.callCount(), 1);
  });
});
