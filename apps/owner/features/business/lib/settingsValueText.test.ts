// Regression: the settings value helpers behind the composed lines. The
// joined lines (settingsText.test.ts, locked) compose label + value from these
// same pieces, and the screens show the values right-aligned.
// Spec: odd/tasks/owner-business.md S4; copy: OwSettings.dc.html.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { accounts, business } from "../../../shared/data/mock.ts";
import { acceptWindowValueText, linkedAccountsValueText } from "./settingsText.ts";

describe("settings value text", () => {
  it("reads the demo accept window value exactly as the OwSettings design shows it", () => {
    assert.equal(acceptWindowValueText(structuredClone(business.acceptWindowMin)), "5 / 30 min");
  });

  it("reads two connected accounts exactly as the OwSettings design shows them", () => {
    assert.equal(linkedAccountsValueText(structuredClone(accounts)), "2 connected");
  });
});
