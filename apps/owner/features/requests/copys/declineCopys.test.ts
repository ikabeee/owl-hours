// Spec: odd/tasks/owner-notification-test-zukki.md T1 (S1). Strings come verbatim
// from handoff-ui/owner-app/design/html/OwDecline.dc.html.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { declineCopys } from "./declineCopys.ts";

const expectedCopys = {
  title: "Why are you declining?",
  busyNow: "I'm busy right now",
  tooFar: "Too far",
  notOffered: "Not a service we offer",
  other: "Other",
  note: "Zukki offers the request to another business right away. The customer won't see your reason.",
  cancel: "Cancel",
  declineRequest: "Decline request",
} as const;

describe("declineCopys", () => {
  for (const [key, text] of Object.entries(expectedCopys)) {
    it(`${key} is "${text}"`, () => {
      assert.equal(declineCopys[key as keyof typeof declineCopys], text);
    });
  }

  it("has no empty string", () => {
    for (const [key, text] of Object.entries(declineCopys)) {
      assert.ok(typeof text === "string" && text.trim() !== "", `${key} is empty`);
    }
  });
});
