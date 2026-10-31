// Spec: odd/tasks/owner-notification-test-zukki.md T2 (S5). Strings come verbatim
// from handoff-ui/owner-app/design/html/OwTestZukki.dc.html.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { testZukkiCopys } from "./testZukkiCopys.ts";

const expectedCopys = {
  title: "Test Zukki",
  subtitle: "Only you see this",
  intro: "Ask what a customer would ask. Zukki answers with your profile, prices and hours. Customers never see this chat.",
  answerTag: "Zukki would answer",
  sourcePrefix: "From: ",
  notInServices: "Not in your services",
  editPrices: "Edit prices",
  addService: "Add a service",
  composerPlaceholder: "Ask like a customer",
  composerLabel: "Ask like a customer",
  sendLabel: "Send",
} as const;

describe("testZukkiCopys", () => {
  for (const [key, text] of Object.entries(expectedCopys)) {
    it(`${key} is "${text}"`, () => {
      assert.equal(testZukkiCopys[key as keyof typeof testZukkiCopys], text);
    });
  }

  it("has no empty string", () => {
    for (const [key, text] of Object.entries(testZukkiCopys)) {
      assert.ok(typeof text === "string" && text.trim() !== "", `${key} is empty`);
    }
  });
});
