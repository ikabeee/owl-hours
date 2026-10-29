// Spec: odd/tasks/owner-business.md S4: the time to accept comes from
// business.acceptWindowMin, the connected count from accounts. Expected strings
// are the composed forms in handoff-ui/owner-app/HANDOFF-RN-UI.md § "Settings".
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { accounts, business } from "../../../shared/data/mock.ts";
import { acceptWindowText, linkedAccountsText } from "./settingsText.ts";

describe("acceptWindowText", () => {
  it("reads the demo accept window exactly as the OwSettings design shows it", () => {
    assert.equal(acceptWindowText(structuredClone(business.acceptWindowMin)), "Time to accept: 5 / 30 min");
  });
});

describe("linkedAccountsText", () => {
  it("reads two connected accounts exactly as the OwSettings design shows them", () => {
    assert.equal(linkedAccountsText(structuredClone(accounts)), "Linked accounts · 2 connected");
  });
});
