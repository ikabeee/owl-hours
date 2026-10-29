// Spec: odd/tasks/owner-ui-build.md, T3.1, L27: the owner sees the possible faults, likely ones first.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { PossibleFault } from "../../../shared/data/types.ts";
import { sortLikelyFirst } from "./possibleFaults.ts";

const wornFillValve: PossibleFault = { label: "Worn fill valve", likelihood: "likely" };
const flapperNotSealing: PossibleFault = { label: "Flapper not sealing", likelihood: "possible" };
const floatTooHigh: PossibleFault = { label: "Float set too high", likelihood: "possible" };
const cracked: PossibleFault = { label: "Cracked tank", likelihood: "likely" };

describe("sortLikelyFirst", () => {
  it("puts the likely faults before the possible ones", () => {
    const sorted = sortLikelyFirst([flapperNotSealing, wornFillValve, floatTooHigh]);

    assert.deepEqual(sorted, [wornFillValve, flapperNotSealing, floatTooHigh]);
  });

  it("keeps Zukki's order inside each likelihood", () => {
    const sorted = sortLikelyFirst([floatTooHigh, cracked, flapperNotSealing, wornFillValve]);

    assert.deepEqual(sorted, [cracked, wornFillValve, floatTooHigh, flapperNotSealing]);
  });

  it("leaves an already ordered list as it is", () => {
    const ordered = [wornFillValve, flapperNotSealing, floatTooHigh];

    assert.deepEqual(sortLikelyFirst(ordered), ordered);
  });

  it("does not change the list it receives", () => {
    const received = [flapperNotSealing, wornFillValve];

    sortLikelyFirst(received);

    assert.deepEqual(received, [flapperNotSealing, wornFillValve]);
  });

  it("returns an empty list for no faults", () => {
    assert.deepEqual(sortLikelyFirst([]), []);
  });
});
