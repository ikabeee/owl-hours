// Spec: docs/HANDOFF-OWNER-APP.md, T5 assignment, test file 1, with operator answer 1:
// customer_approved "Start trip" -> en_route; en_route "I'm here" -> on_site; on_site "Finish", disabled
// (T5.1 enables it); quoted, owner_confirmed and done: disabled with no next status.
// The label of the disabled button at quoted, owner_confirmed and done is not pinned.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { primaryAction } from "./jobAction.ts";

describe("primaryAction", () => {
  it('at customer_approved reads "Start trip" and leads to en_route', () => {
    assert.deepEqual(primaryAction("customer_approved"), { label: "Start trip", nextStatus: "en_route", isDisabled: false });
  });

  it('at en_route reads "I\'m here" and leads to on_site', () => {
    assert.deepEqual(primaryAction("en_route"), { label: "I'm here", nextStatus: "on_site", isDisabled: false });
  });

  it('at on_site reads "Finish", disabled until T5.1, and leads nowhere', () => {
    assert.deepEqual(primaryAction("on_site"), { label: "Finish", nextStatus: null, isDisabled: true });
  });

  for (const status of ["quoted", "owner_confirmed", "done"] as const) {
    it(`at ${status} is disabled and leads nowhere`, () => {
      const action = primaryAction(status);

      assert.equal(action.isDisabled, true);
      assert.equal(action.nextStatus, null);
    });
  }
});
