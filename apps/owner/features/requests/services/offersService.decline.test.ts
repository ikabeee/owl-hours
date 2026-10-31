// Spec: odd/tasks/owner-notification-test-zukki.md S1. "Decline request" calls
// offersService.decline(id, reason); back in Requests the item reads "Declined"
// (HANDOFF-RN-UI.md l.277; OwRequests.dc.html l.31 renders a declined offer's
// row state as "Declined"). The reason is a DeclineReason id from
// shared/data/types.ts (busy, too_far, not_offered, other), already used by the
// API decline bodies in apps/api/src/routes/v1-owner.ts.
// Every test builds its own service so state never leaks between tests.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { DeclineReason } from "../../../shared/data/types.ts";
import { createFakeOffersClient, createOffersService } from "./offersService.ts";

function buildService() {
  return createOffersService(createFakeOffersClient());
}

// The RequestOffer type gains an optional declineReason; read it through
// unknown so this file pins behavior, not the exact type shape.
function declineReasonOf(offer: unknown): unknown {
  return (offer as { declineReason?: unknown } | null)?.declineReason;
}

const reasons: DeclineReason[] = ["busy", "too_far", "not_offered", "other"];

describe("offersService.decline with a reason", () => {
  for (const reason of reasons) {
    it(`decline with "${reason}" reads back declined with that reason`, async () => {
      const service = buildService();

      const declined = await service.decline("req_ana", reason);

      assert.equal(declined?.status, "declined");
      assert.equal(declineReasonOf(declined), reason);
      assert.equal((await service.getOffer("req_ana"))?.status, "declined");
      assert.equal(declineReasonOf(await service.getOffer("req_ana")), reason);
    });
  }

  it("leaves a settled offer untouched when a reason is passed", async () => {
    const service = buildService();

    assert.equal(await service.decline("req_carlos", "busy"), null);
    assert.equal((await service.getOffer("req_carlos"))?.status, "accepted");
    assert.equal(await service.decline("nope", "busy"), null);
  });
});

describe("offersService.decline backward compatibility", () => {
  it("existing single-arg callers still decline: decline(id) moves req_ana to declined", async () => {
    const service = buildService();

    const declined = await service.decline("req_ana");

    assert.equal(declined?.status, "declined");
    assert.equal((await service.getOffer("req_ana"))?.status, "declined");
  });
});
