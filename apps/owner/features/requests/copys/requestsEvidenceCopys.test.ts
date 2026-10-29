// Spec: odd/tasks/owner-ui-build.md, T3.1, L27.
// Handoff-sourced strings: handoff-ui/owner-app/design/html/OwRequest.dc.html and HANDOFF-RN-UI §8.
// New strings (no handoff source, pending the user's approval): the possible-faults section.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { requestsCopys } from "./requestsCopys.ts";

const fromHandoff = {
  newRequest: "New request",
  sentByZukki: "Sent by Zukki",
  videoFrameAlt: "Frame from the customer's video",
  videoLabel: "Video",
  zukkiName: "Zukki",
};

const newCopy = {
  possibleFaultsHeading: "Possible faults",
  likelihoodLikely: "Likely",
  likelihoodPossible: "Possible",
  photoLabel: "Photo",
};

function expectCopys(expected: Record<string, string>) {
  for (const [key, text] of Object.entries(expected)) {
    it(`${key} is "${text}"`, () => {
      assert.equal(requestsCopys[key as keyof typeof requestsCopys], text);
    });
  }
}

describe("requestsCopys from the handoff design", () => {
  expectCopys(fromHandoff);
});

describe("requestsCopys new for the possible faults", () => {
  expectCopys(newCopy);
});
