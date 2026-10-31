// Spec: odd/tasks/owner-notification-test-zukki.md T1 (S1, S2). The decline sheet's
// pure logic: the four design reasons in order, when "Decline request" is enabled,
// the ?decline=1 sheet entry, and Cancel clearing the selection so nothing declines.
// The route and the DOM screen own the rendering; this module owns the decisions.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { DeclineReason } from "../../../shared/data/types.ts";
import {
  DECLINE_REASONS,
  canSubmitDecline,
  createDeclineSheet,
  shouldOpenDeclineSheet,
} from "./declineSheet.ts";

describe("declineSheet reasons", () => {
  it("lists the four design reasons in order, with the API reason ids", () => {
    assert.deepEqual(DECLINE_REASONS, [
      { id: "busy", label: "I'm busy right now" },
      { id: "too_far", label: "Too far" },
      { id: "not_offered", label: "Not a service we offer" },
      { id: "other", label: "Other" },
    ]);
  });

  it("keeps Decline request disabled until a reason is chosen", () => {
    assert.equal(canSubmitDecline(null), false);
  });

  for (const reason of DECLINE_REASONS) {
    it(`enables Decline request for "${reason.label}"`, () => {
      assert.equal(canSubmitDecline(reason.id), true);
    });
  }
});

describe("declineSheet entry (?decline=1, S2)", () => {
  it("starts open for decline=1", () => {
    assert.equal(shouldOpenDeclineSheet("1"), true);
  });

  for (const param of [undefined, "", "0", "yes"]) {
    it(`starts closed for decline=${String(param)}`, () => {
      assert.equal(shouldOpenDeclineSheet(param), false);
    });
  }
});

describe("declineSheet cancel (S1: Cancel closes the sheet, nothing declined)", () => {
  it("cancel closes the sheet and clears the chosen reason, so confirm submits nothing", () => {
    const sheet = createDeclineSheet({ startOpen: true });
    sheet.select("too_far");

    sheet.cancel();

    assert.equal(sheet.getSnapshot().isOpen, false);
    assert.equal(sheet.getSnapshot().selection, null);
    assert.equal(sheet.confirm(), null);
  });

  it("confirm returns the chosen reason for the service call", () => {
    const sheet = createDeclineSheet({ startOpen: true });
    sheet.select("too_far");

    const confirmed: DeclineReason | null = sheet.confirm();

    assert.equal(confirmed, "too_far");
  });
});
