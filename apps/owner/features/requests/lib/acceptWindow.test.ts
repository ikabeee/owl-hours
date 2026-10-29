// Regression test for the accept window used as the progress bar max.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { acceptWindowSeconds } from "./countdown.ts";

describe("acceptWindowSeconds", () => {
  const acceptWindowMin = { urgent: 5, other: 30 };

  it("gives urgent offers the urgent window in seconds", () => {
    assert.equal(acceptWindowSeconds(true, acceptWindowMin), 300);
  });

  it("gives other offers the other window in seconds", () => {
    assert.equal(acceptWindowSeconds(false, acceptWindowMin), 1800);
  });
});
