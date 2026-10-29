// New test (not part of the locked T5 set): packages/shared quoteSchema requires at least one line,
// so a quote without lines cannot be sent.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canSendQuote } from "./lineValidation.ts";

describe("canSendQuote", () => {
  it("is false for a quote without lines", () => {
    assert.equal(canSendQuote([]), false);
  });
});
