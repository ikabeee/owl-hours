// Operator decision (T5, answer 9): chats (composer placeholder) and jobs (approval line, copy)
// both need the customer's first name (two real callers).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { firstName } from "./firstName.ts";

describe("firstName", () => {
  it("keeps only the first word of 'first name + initial'", () => {
    assert.equal(firstName("Ana L."), "Ana");
  });

  it("returns a single-word name unchanged", () => {
    assert.equal(firstName("Lucía"), "Lucía");
  });
});
