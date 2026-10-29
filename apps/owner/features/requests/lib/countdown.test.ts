// Spec: docs/HANDOFF-OWNER-APP.md, T3 assignment, test file 1.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatCountdown, secondsLeft } from "./countdown.ts";

describe("formatCountdown", () => {
  it("formats the demo value as minutes and zero-padded seconds", () => {
    assert.equal(formatCountdown(272), "4:32");
  });

  it("formats zero as 0:00", () => {
    assert.equal(formatCountdown(0), "0:00");
  });

  it("clamps negative input to 0:00", () => {
    assert.equal(formatCountdown(-5), "0:00");
  });
});

describe("secondsLeft", () => {
  const reqAnaExpiresAt = "2026-10-28T00:10:00-05:00";

  it("counts the seconds from the injected now to expiresAt", () => {
    const now = "2026-10-28T00:05:28-05:00";
    assert.equal(secondsLeft(reqAnaExpiresAt, now), 272);
  });

  it("never goes negative once expiresAt has passed", () => {
    const now = "2026-10-28T00:10:01-05:00";
    assert.equal(secondsLeft(reqAnaExpiresAt, now), 0);
  });
});
