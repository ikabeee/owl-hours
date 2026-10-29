// Spec: docs/HANDOFF-OWNER-APP.md, T3 assignment, test file 3.
// Strings come from what RequestScreen renders today, cross-checked against
// handoff-ui/owner-app/design/html/OwRequest.dc.html.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { requestsCopys } from "./requestsCopys.ts";

const expectedCopys = {
  acceptWithin: "Accept within",
  countdownLabel: "Time left to accept",
  ignoredNotice: "If you don't answer, Zukki offers the job to the next business.",
  urgent: "Urgent",
  approximateDistance: "km, approximate",
  decline: "Decline",
  acceptAndChat: "Accept and chat",
};

describe("requestsCopys", () => {
  for (const [key, text] of Object.entries(expectedCopys)) {
    it(`${key} is "${text}"`, () => {
      assert.equal(requestsCopys[key as keyof typeof requestsCopys], text);
    });
  }

  it("has no empty string", () => {
    for (const [key, text] of Object.entries(requestsCopys)) {
      assert.notEqual(text.trim(), "", `${key} is empty`);
    }
  });
});
