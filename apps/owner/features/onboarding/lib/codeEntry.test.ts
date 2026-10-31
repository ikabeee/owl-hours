// Spec: odd/tasks/owner-onboarding.md, S4; unit T7, test file 3.
// "Resend code in 0:24" and "Change number" from OwVerify.dc.html; auto-submit on the
// 6th digit from HANDOFF-RN-UI §Verify. `now` is injected: no real Date.now().
// Q (operator): the HTML shows only the countdown state — what is the exact link text at 0?
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CODE_LENGTH, enterDigit, resendSecondsLeft, resendState } from "./codeEntry.ts";

describe("enterDigit accumulation", () => {
  it("accumulates digits up to 6 without submitting", () => {
    assert.deepEqual(enterDigit("", "4"), { code: "4", submitted: false });
    assert.deepEqual(enterDigit("48291", "2"), { code: "482912", submitted: true });
  });

  it("ignores non-digits", () => {
    assert.deepEqual(enterDigit("48", "a"), { code: "48", submitted: false });
    assert.deepEqual(enterDigit("48", " "), { code: "48", submitted: false });
  });

  it("ignores input once 6 digits are entered", () => {
    assert.deepEqual(enterDigit("482912", "3"), { code: "482912", submitted: false });
  });

  it("the code holds 6 digits", () => {
    assert.equal(CODE_LENGTH, 6);
  });
});

describe("resend countdown", () => {
  const resendAt = "2026-10-28T00:06:00-05:00";

  it("reads Resend code in 0:24 twenty-four seconds before the resend time", () => {
    const now = "2026-10-28T00:05:36-05:00";

    assert.equal(resendSecondsLeft(resendAt, now), 24);
    assert.deepEqual(resendState(24), { kind: "countdown", text: "Resend code in 0:24" });
  });

  it("turns into the link state at 0 and never goes negative", () => {
    assert.equal(resendSecondsLeft(resendAt, "2026-10-28T00:06:01-05:00"), 0);
    assert.equal(resendState(0).kind, "link");
  });
});
