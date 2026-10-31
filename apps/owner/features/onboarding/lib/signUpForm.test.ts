// Spec: odd/tasks/crystal-pr-handoff-fixes.md, T4, S1.
// "Send code", disabled until the form is valid. Demo email is the onboarding demo
// seed; the name still comes from shared/data/mock.ts.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { owner } from "../../../shared/data/mock.ts";
import { isSendCodeEnabled } from "./signUpForm.ts";

const DEMO_EMAIL = "daniel@northside-plumbing.example";
const validForm = { name: owner.name, email: DEMO_EMAIL, termsAccepted: true };

describe("isSendCodeEnabled", () => {
  it("is enabled when the name is filled, the demo email is valid and the terms are accepted", () => {
    assert.equal(isSendCodeEnabled(validForm), true);
  });

  it("accepts an email with surrounding spaces and uppercase", () => {
    assert.equal(isSendCodeEnabled({ ...validForm, email: " Daniel@Example.COM " }), true);
  });

  it("is disabled when the name is missing", () => {
    assert.equal(isSendCodeEnabled({ ...validForm, name: "" }), false);
  });

  it("is disabled when the name is only whitespace", () => {
    assert.equal(isSendCodeEnabled({ ...validForm, name: "   " }), false);
  });

  it("is disabled when the email is missing", () => {
    assert.equal(isSendCodeEnabled({ ...validForm, email: "" }), false);
  });

  it("is disabled when the email is not an email", () => {
    assert.equal(isSendCodeEnabled({ ...validForm, email: "not-an-email" }), false);
    assert.equal(isSendCodeEnabled({ ...validForm, email: "daniel@" }), false);
  });

  it("is disabled when the terms are not accepted", () => {
    assert.equal(isSendCodeEnabled({ ...validForm, termsAccepted: false }), false);
  });
});
