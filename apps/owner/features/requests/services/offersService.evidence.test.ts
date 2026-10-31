// Spec: odd/tasks/owner-ui-build.md, T3.1, L27: the request carries the customer's evidence
// (video, quote) and Zukki's possible faults; an offer without a diagnosis carries none.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createFakeOffersClient, createOffersService } from "./offersService.ts";

function buildService() {
  return createOffersService(createFakeOffersClient());
}

describe("offersService.getOffer evidence for req_ana", () => {
  it("returns the 14 second video of the customer", async () => {
    const offer = await buildService().getOffer("req_ana");

    assert.deepEqual(offer?.media, [{ kind: "video", url: "bath-leak-video", thumbUrl: "bath-leak", durationS: 14 }]);
  });

  it("returns the customer's quote", async () => {
    const offer = await buildService().getOffer("req_ana");

    assert.equal(offer?.customerQuote, "The toilet won't stop running and water is reaching the hallway.");
  });

  it("returns the possible faults, the likely one matching Zukki's summary", async () => {
    const offer = await buildService().getOffer("req_ana");

    assert.deepEqual(offer?.possibleFaults, [
      { label: "Worn fill valve", likelihood: "likely" },
      { label: "Flapper not sealing", likelihood: "possible" },
      { label: "Float set too high", likelihood: "possible" },
    ]);
  });

  it("keeps the evidence once the offer is accepted", async () => {
    const service = buildService();

    const accepted = await service.accept("req_ana");

    assert.equal(accepted?.possibleFaults?.length, 3);
    assert.equal(accepted?.media.length, 1);
  });
});

describe("offersService.getOffer without evidence", () => {
  it("returns no video, quote or faults for an offer Zukki could not diagnose", async () => {
    const offer = await buildService().getOffer("req_carlos");

    assert.deepEqual(offer?.media, []);
    assert.equal(offer?.customerQuote, undefined);
    assert.deepEqual(offer?.possibleFaults ?? [], []);
  });
});
