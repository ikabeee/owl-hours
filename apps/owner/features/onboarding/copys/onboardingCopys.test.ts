// Spec: odd/tasks/owner-onboarding.md, S2–S7; unit T7, test file 7.
// Every visible string comes from the handoff: the feature document (which quotes
// handoff-ui/owner-app/HANDOFF-RN-UI.md §§Verify, Setup, Live, Error states) and the
// Ow*.dc.html screens. Key names are this module's; values are verbatim copy.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { onboardingCopys } from "./onboardingCopys.ts";

const expectedCopys = {
  codeError: "That code didn't work. Try again.",
  websiteReading: "Reading your website…",
  websiteImported: "Imported 12 services and 4 prices",
  liveTitle: "Northside is live on Zukki",
  loadError: "Something went wrong.",
  retry: "Try again",
  resendLink: "Resend code",
  addPrice: "Add a price",
  nightRequests: "Urgent night requests",
  nightRequestsWindow: "10 PM–7 AM, with your night fee",
} as const;

describe("onboardingCopys", () => {
  for (const [key, text] of Object.entries(expectedCopys)) {
    it(`${key} is "${text}"`, () => {
      assert.equal(onboardingCopys[key as keyof typeof onboardingCopys], text);
    });
  }

  it("has no empty string", () => {
    for (const [key, text] of Object.entries(onboardingCopys)) {
      assert.equal(typeof text, "string", `${key} is not a string`);
      assert.notEqual(text.trim(), "", `${key} is empty`);
    }
  });
});
