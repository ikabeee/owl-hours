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

// Spec: odd/tasks/crystal-pr-handoff-fixes.md, T4, S1 + S5. Only the phone wording
// changes to email (there is no SMS provider); every other handoff string stays
// byte-identical.
describe("onboardingCopys email sign-in", () => {
  it('asks for "Email" instead of a mobile number', () => {
    assert.equal(onboardingCopys.emailLabel, "Email");
  });

  it("says the code arrives by email", () => {
    assert.equal(onboardingCopys.emailHelp, "We'll email you a code to confirm it.");
  });

  it('offers "Change email" on verify', () => {
    assert.equal(onboardingCopys.changeEmail, "Change email");
  });

  it("has no phone copy left", () => {
    for (const key of ["phoneLabel", "phoneHelp", "changeNumber"]) {
      assert.ok(!(key in onboardingCopys), `${key} still exists`);
    }
  });

  it("keeps every other handoff string byte-identical", () => {
    assert.equal(onboardingCopys.sendCode, "Send code");
    assert.equal(onboardingCopys.verifyTitle, "Enter the code");
    assert.equal(onboardingCopys.verifySentPrefix, "We sent a 6-digit code to");
    assert.equal(onboardingCopys.resendLink, "Resend code");
    assert.equal(onboardingCopys.codeError, "That code didn't work. Try again.");
  });
});
