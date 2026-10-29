// Spec: docs/HANDOFF-OWNER-APP.md, T5 assignment, test file 4.
// Source: handoff-ui/owner-app/design/html/OwChat.dc.html, the suggestion row above the composer.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { chatsCopys } from "./chatsCopys.ts";

describe("chatsCopys suggestion row", () => {
  it('zukkiSuggestsQuote is "Zukki suggests sending the quote:"', () => {
    assert.equal(chatsCopys.zukkiSuggestsQuote, "Zukki suggests sending the quote:");
  });

  it('reviewQuote is "Review"', () => {
    assert.equal(chatsCopys.reviewQuote, "Review");
  });
});
