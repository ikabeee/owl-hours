// Spec: docs/HANDOFF-OWNER-APP.md, T5.1 assignment, Job detail bullet: finishing is possible only at
// on_site. One predicate is the single source for the footer button and for the service guard.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { JobStatus } from "../../../shared/data/types.ts";
import { canFinish } from "./finishAvailability.ts";

describe("canFinish", () => {
  it("is true at on_site", () => {
    assert.equal(canFinish("on_site"), true);
  });

  const otherStatuses: JobStatus[] = ["quoted", "owner_confirmed", "customer_approved", "en_route", "done"];
  for (const status of otherStatuses) {
    it(`is false at ${status}`, () => {
      assert.equal(canFinish(status), false);
    });
  }
});
