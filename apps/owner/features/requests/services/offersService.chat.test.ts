// Spec: odd/tasks/owner-ui-build.md, L12-L13: Accept opens the offer's conversation,
// found by offerId (req_ana -> c_ana), never by building the id from the offer id.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createFakeOffersClient, createOffersService } from "./offersService.ts";

function buildService() {
  return createOffersService(createFakeOffersClient());
}

describe("offersService.findChat", () => {
  it("returns c_ana once req_ana is accepted", async () => {
    const service = buildService();

    await service.accept("req_ana");

    assert.equal(await service.findChat("req_ana"), "c_ana");
  });

  it("returns the conversation of an offer accepted earlier", async () => {
    assert.equal(await buildService().findChat("req_carlos"), "c_carlos");
  });

  it("returns null while the offer is still offered", async () => {
    assert.equal(await buildService().findChat("req_ana"), null);
  });

  it("returns null for an unknown offer", async () => {
    assert.equal(await buildService().findChat("nope"), null);
  });
});
