// New regression test (not part of the locked T4 set): the composer placeholder
// reads "Write to Ana", so the screen needs the customer's first name.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { firstName } from "./customerName.ts";

describe("firstName", () => {
  it("keeps only the first word of 'first name + initial'", () => {
    assert.equal(firstName("Ana L."), "Ana");
  });

  it("returns a single-word name unchanged", () => {
    assert.equal(firstName("Lucía"), "Lucía");
  });
});
