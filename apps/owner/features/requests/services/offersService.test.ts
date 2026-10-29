// Spec: docs/HANDOFF-OWNER-APP.md, T3 assignment, test file 2.
// Every test builds its own service so state never leaks between tests.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { offers as mockOffers } from "../../../shared/data/mock.ts";
import { createFakeOffersClient, createOffersService } from "./offersService.ts";

function buildService() {
  return createOffersService(createFakeOffersClient());
}

describe("offersService.getOffer", () => {
  it("returns the offered request for Ana L.", async () => {
    const offer = await buildService().getOffer("req_ana");

    assert.equal(offer?.customerName, "Ana L.");
    assert.equal(offer?.distanceKm, 1.2);
    assert.equal(offer?.urgent, true);
    assert.equal(offer?.status, "offered");
  });

  it("returns null for an unknown id", async () => {
    assert.equal(await buildService().getOffer("nope"), null);
  });
});

describe("offersService transitions from an offered offer", () => {
  it("accept moves the offer to accepted", async () => {
    const service = buildService();

    const accepted = await service.accept("req_ana");

    assert.equal(accepted?.status, "accepted");
    assert.equal((await service.getOffer("req_ana"))?.status, "accepted");
  });

  it("decline moves the offer to declined", async () => {
    const service = buildService();

    const declined = await service.decline("req_ana");

    assert.equal(declined?.status, "declined");
    assert.equal((await service.getOffer("req_ana"))?.status, "declined");
  });
});

describe("offersService transitions from an offer that is no longer offered", () => {
  const settledOffers = [
    { id: "req_carlos", status: "accepted" },
    { id: "req_tom", status: "declined" },
    { id: "req_grace", status: "expired" },
  ] as const;

  for (const { id, status } of settledOffers) {
    it(`accept returns null and keeps ${id} ${status}`, async () => {
      const service = buildService();

      assert.equal(await service.accept(id), null);
      assert.equal((await service.getOffer(id))?.status, status);
    });

    it(`decline returns null and keeps ${id} ${status}`, async () => {
      const service = buildService();

      assert.equal(await service.decline(id), null);
      assert.equal((await service.getOffer(id))?.status, status);
    });
  }

  it("accept and decline return null for an unknown id", async () => {
    const service = buildService();

    assert.equal(await service.accept("nope"), null);
    assert.equal(await service.decline("nope"), null);
  });
});

describe("offersService isolation", () => {
  it("does not mutate the shared mock: a fresh instance still sees req_ana as offered", async () => {
    await buildService().accept("req_ana");

    const fresh = buildService();

    assert.equal((await fresh.getOffer("req_ana"))?.status, "offered");
    assert.equal(mockOffers.find((offer) => offer.id === "req_ana")?.status, "offered");
  });
});
