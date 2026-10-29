// L32 follow-ups 1 and 3: the faults the screen receives are sorted, default to an empty list,
// and never break on a likelihood the backend may add later.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { requestFaults } from "./requestFaults.ts";

describe("requestFaults", () => {
  it("is an empty list when the offer has no faults", () => {
    assert.deepEqual(requestFaults({}), []);
  });

  it("puts likely faults first", () => {
    const faults = requestFaults({
      possibleFaults: [
        { label: "Flapper not sealing", likelihood: "possible" },
        { label: "Worn fill valve", likelihood: "likely" },
      ],
    });
    assert.deepEqual(faults.map((fault) => fault.label), ["Worn fill valve", "Flapper not sealing"]);
  });

  it("treats an unknown likelihood as possible instead of failing", () => {
    const faults = requestFaults({
      possibleFaults: [
        { label: "Cracked tank", likelihood: "certain" as never },
        { label: "Worn fill valve", likelihood: "likely" },
      ],
    });
    assert.deepEqual(faults, [
      { label: "Worn fill valve", likelihood: "likely" },
      { label: "Cracked tank", likelihood: "possible" },
    ]);
  });
});
