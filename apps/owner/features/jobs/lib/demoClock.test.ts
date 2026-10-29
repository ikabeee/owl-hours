// New tests (not part of the locked T5 set): the demo hooks need a clock that starts at the designs' "12:05 AM"
// and keeps that timestamp's UTC offset, because wall-clock text reads the offset (D7/L33). A plain
// toISOString() would report UTC ("5:05 AM").
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createDemoClock } from "./demoClock.ts";

const DEMO_START = "2026-10-28T00:05:28-05:00";

function clockAfter(elapsedMs: number) {
  let realNow = 1_000_000;
  const clock = createDemoClock(DEMO_START, () => realNow);
  realNow += elapsedMs;
  return clock();
}

describe("createDemoClock", () => {
  it("starts at the demo instant, in the demo's own offset", () => {
    assert.equal(Date.parse(clockAfter(0)), Date.parse(DEMO_START));
    assert.match(clockAfter(0), /-05:00$/);
  });

  it("advances with real time: 90 seconds later it reads 12:06 AM", () => {
    assert.equal(Date.parse(clockAfter(90_000)), Date.parse("2026-10-28T00:06:58-05:00"));
    assert.match(clockAfter(90_000), /^2026-10-28T00:06:58/);
  });

  it("keeps a UTC start in UTC", () => {
    const clock = createDemoClock("2026-10-28T05:05:28Z", () => 0);

    assert.match(clock(), /^2026-10-28T05:05:28.*Z$/);
  });
});
