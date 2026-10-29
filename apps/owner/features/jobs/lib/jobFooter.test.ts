// Spec: operator answer 1 (L36): before approval (quoted, owner_confirmed) the job footer is hidden;
// from customer_approved on it holds the primary button (disabled at on_site and done, see jobAction).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { JobStatus } from "../../../shared/data/types.ts";
import { isJobFooterVisible } from "./jobFooter.ts";

const visibilityByStatus: Array<[JobStatus, boolean]> = [
  ["quoted", false],
  ["owner_confirmed", false],
  ["customer_approved", true],
  ["en_route", true],
  ["on_site", true],
  ["done", true],
];

describe("isJobFooterVisible", () => {
  for (const [status, isVisible] of visibilityByStatus) {
    it(`is ${isVisible} at ${status}`, () => {
      assert.equal(isJobFooterVisible(status), isVisible);
    });
  }
});
