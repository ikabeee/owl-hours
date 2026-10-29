// Spec: odd/tasks/owner-ui-build.md, T4.1, L14 items 2 and 6.
// Source: HANDOFF-RN-UI.md section 8, "Every screen also needs", Error:
// owl `failed` + "Something went wrong." + "Try again". No raw error message.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { chatsCopys } from "./chatsCopys.ts";

describe("chatsCopys error state", () => {
  it('somethingWentWrong is "Something went wrong."', () => {
    assert.equal(chatsCopys.somethingWentWrong, "Something went wrong.");
  });

  it('tryAgain is "Try again"', () => {
    assert.equal(chatsCopys.tryAgain, "Try again");
  });
});
