// Spec: odd/tasks/owner-onboarding.md, S1 and S5; unit T7, test file 4.
// Flow from HANDOFF-RN-UI §Flows: "intro → sign-up → verify → business → prices →
// area → live → requests. "I already have an account" goes to requests.
// "Continue with Facebook" skips verify." Routes are plain path strings.
// Routes live under app/onboarding/ (operator, L2): an (onboarding) group would resolve
// /business onto the Business tab.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ONBOARDING_ORDER, resolveNext, stepLabel } from "./setupSteps.ts";

describe("stepLabel", () => {
  it('reads "Step n of 3" for steps 1 to 3', () => {
    assert.equal(stepLabel(1), "Step 1 of 3");
    assert.equal(stepLabel(2), "Step 2 of 3");
    assert.equal(stepLabel(3), "Step 3 of 3");
  });
});

describe("onboarding flow order", () => {
  it("runs intro → sign-up → verify → business → prices → area → live → requests", () => {
    assert.deepEqual(ONBOARDING_ORDER, [
      "/onboarding/intro",
      "/onboarding/sign-up",
      "/onboarding/verify",
      "/onboarding/business",
      "/onboarding/prices",
      "/onboarding/area",
      "/onboarding/live",
      "/requests",
    ]);

    let current = "/onboarding/intro";
    const visited = [current];
    while (current !== "/requests") {
      current = resolveNext(current, "next");
      visited.push(current);
    }
    assert.deepEqual(visited, ONBOARDING_ORDER);
  });

  it("Continue with Facebook skips verify", () => {
    assert.equal(resolveNext("/onboarding/sign-up", "facebook"), "/onboarding/business");
  });

  it("I already have an account goes to requests", () => {
    assert.equal(resolveNext("/onboarding/intro", "has-account"), "/requests");
  });
});
