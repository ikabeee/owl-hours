// Spec: odd/tasks/owner-business.md S3: validation as in the quote, positive whole numbers.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isValidPrice } from "./priceValidation.ts";

describe("isValidPrice", () => {
  it("passes positive whole numbers", () => {
    for (const amount of [1, 45, 350]) {
      assert.equal(isValidPrice(amount), true);
    }
  });

  it("fails zero", () => {
    assert.equal(isValidPrice(0), false);
  });

  it("fails negatives", () => {
    for (const amount of [-1, -45]) {
      assert.equal(isValidPrice(amount), false);
    }
  });

  it("fails decimals", () => {
    for (const amount of [4.5, 60.99]) {
      assert.equal(isValidPrice(amount), false);
    }
  });

  it("fails NaN", () => {
    assert.equal(isValidPrice(NaN), false);
  });
});
