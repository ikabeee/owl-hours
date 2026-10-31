// Spec: AGENTS.md "Location privacy: approximate area only until the customer approves a visit";
// docs/HANDOFF-OWNER-APP.md, T5 assignment: the address is shown only from customer_approved on.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob } from "../../../shared/data/mock.ts";
import type { JobStatus } from "../../../shared/data/types.ts";
import { isAddressVisible, visibleAddress } from "./addressVisibility.ts";

const visibilityByStatus: Array<[JobStatus, boolean]> = [
  ["quoted", false],
  ["owner_confirmed", false],
  ["customer_approved", true],
  ["en_route", true],
  ["on_site", true],
  ["done", true],
];

describe("isAddressVisible", () => {
  for (const [status, isVisible] of visibilityByStatus) {
    it(`is ${isVisible} at ${status}`, () => {
      assert.equal(isAddressVisible(status), isVisible);
    });
  }
});

describe("visibleAddress", () => {
  it("returns Ana's street address once she approved", () => {
    assert.equal(visibleAddress(anaJob), "128 Palm Ave, apt 4");
  });

  it("returns null before approval, even when the job row already carries an address", () => {
    assert.equal(visibleAddress({ ...anaJob, status: "quoted" }), null);
  });

  it("returns null when an approved job has no address", () => {
    const { address: _address, ...jobWithoutAddress } = anaJob;

    assert.equal(visibleAddress(jobWithoutAddress), null);
  });
});
