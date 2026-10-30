// Spec: odd/tasks/owner-onboarding.md, S3; unit T7, test file 2.
// "Send code", disabled until the form is valid. Demo values from shared/data/mock.ts.
// Phone rule (operator, L2): 10–15 digits once spaces, "+" and dashes are removed (E.164 maximum).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { owner } from "../../../shared/data/mock.ts";
import { isSendCodeEnabled } from "./signUpForm.ts";

const validForm = { name: "Daniel Ruiz", phone: owner.phone, termsAccepted: true };

describe("isSendCodeEnabled", () => {
  it("is enabled when the name is filled, the demo number is valid and the terms are accepted", () => {
    assert.equal(isSendCodeEnabled(validForm), true);
  });

  it("is disabled when the name is missing", () => {
    assert.equal(isSendCodeEnabled({ ...validForm, name: "" }), false);
  });

  it("is disabled when the name is only whitespace", () => {
    assert.equal(isSendCodeEnabled({ ...validForm, name: "   " }), false);
  });

  it("is disabled when the mobile number is missing", () => {
    assert.equal(isSendCodeEnabled({ ...validForm, phone: "" }), false);
  });

  it("is disabled when the mobile number is not a number", () => {
    assert.equal(isSendCodeEnabled({ ...validForm, phone: "not-a-number" }), false);
  });

  it("accepts 10 and 15 digits written with spaces, + and dashes", () => {
    assert.equal(isSendCodeEnabled({ ...validForm, phone: "555-014-2290" }), true);
    assert.equal(isSendCodeEnabled({ ...validForm, phone: "+52 1 555 014 2290 12" }), true);
  });

  it("is disabled with 9 or 16 digits", () => {
    assert.equal(isSendCodeEnabled({ ...validForm, phone: "555 014 229" }), false);
    assert.equal(isSendCodeEnabled({ ...validForm, phone: "+52 1 555 014 2290 123" }), false);
  });

  it("is disabled when the terms are not accepted", () => {
    assert.equal(isSendCodeEnabled({ ...validForm, termsAccepted: false }), false);
  });
});
