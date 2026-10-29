// Spec: odd/tasks/owner-business.md S2, S4, S5. Strings come from
// handoff-ui/owner-app/design/html/{OwBusiness,OwSettings}.dc.html, except the
// footnote and the error pair, which come from handoff-ui/owner-app/HANDOFF-RN-UI.md.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { businessCopys } from "./businessCopys.ts";

const expectedCopys = {
  businessHeading: "What Zukki knows about your business",
  businessFootnote: "Zukki uses this to answer customers. Other businesses never see your chats.",
  takingRequestsNow: "Taking requests now",
  urgentRequests: "Urgent requests",
  ringOnSilentAtNight: "Ring on silent at night",
  polishByDefault: "Polish with Zukki by default",
  signOut: "Sign out",
  errorTitle: "Something went wrong.",
  errorRetry: "Try again",
} as const;

describe("businessCopys", () => {
  for (const [key, text] of Object.entries(expectedCopys)) {
    it(`${key} is "${text}"`, () => {
      assert.equal(businessCopys[key as keyof typeof businessCopys], text);
    });
  }

  it("has no empty string", () => {
    for (const [key, text] of Object.entries(businessCopys)) {
      assert.notEqual(text.trim(), "", `${key} is empty`);
    }
  });
});
