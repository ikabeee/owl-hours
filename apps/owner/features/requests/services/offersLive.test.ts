// Live mode: the Requests screens read the owner API's offer cards (private.offer_card plus signed
// media links) as RequestOffer, and accept/decline go to the API.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OwnerApiError } from "../../../lib/ownerApi.ts";
import { createFakeOwnerApi } from "../../../lib/ownerApi.fake.ts";
import { createLiveOffersService, toRequestOffer } from "./offersLive.ts";
import type { ApiOffer } from "./offersLive.ts";

const card: ApiOffer = {
  id: "h1",
  conversationId: "c1",
  status: "offered",
  urgent: true,
  distanceKm: 0.9,
  suggestedQuote: { min: 95, max: 125 },
  offeredAt: "2026-10-31T16:00:00Z",
  expiresAt: "2026-10-31T16:05:00Z",
  declineReason: null,
  title: "Toilet won't stop running",
  zukkiSummary: "Water reaching the hallway.",
  customerName: "Ana L.",
  approxLocation: "0.9 km away",
  customerQuote: "It keeps running",
  media: [
    { kind: "video", url: "https://s/v.mp4", thumbUrl: null, durationMs: 12_400 },
    { kind: "image", url: "https://s/frame.jpg", thumbUrl: "https://s/frame-t.jpg", durationMs: null },
    { kind: "image", url: null, thumbUrl: null, durationMs: null },
  ],
};

describe("toRequestOffer", () => {
  it("maps the card, its media and the transcript", () => {
    const offer = toRequestOffer(card);
    assert.equal(offer.customerName, "Ana L.");
    assert.equal(offer.customerQuote, "It keeps running");
    assert.deepEqual(offer.suggestedQuote, { min: 95, max: 125 });
    assert.deepEqual(offer.media, [
      { kind: "video", url: "https://s/v.mp4", thumbUrl: "https://s/v.mp4", durationS: 12 },
      { kind: "photo", url: "https://s/frame.jpg", thumbUrl: "https://s/frame-t.jpg" },
    ]);
  });

  it("fills gaps a fresh request can have and reads a closed handoff as accepted", () => {
    const offer = toRequestOffer({ ...card, status: "closed", customerName: null, title: null, zukkiSummary: null, customerQuote: null, suggestedQuote: null, distanceKm: null });
    assert.equal(offer.status, "accepted");
    assert.equal(offer.customerName, "Customer");
    assert.equal(offer.title, "New request");
    assert.equal(offer.customerQuote, undefined);
    assert.deepEqual(offer.suggestedQuote, { min: 0, max: 0 });
  });
});

describe("live offers service", () => {
  it("accepts through the API and opens the offer's chat", async () => {
    let status = "offered";
    const { api, calls } = createFakeOwnerApi({
      "GET /offers/h1": () => ({ ...card, status }),
      "POST /offers/h1/accept": () => {
        status = "accepted";
        return { id: "h1", status };
      },
    });
    const service = createLiveOffersService(api);
    assert.equal((await service.accept("h1"))?.status, "accepted");
    assert.equal(await service.findChat("h1"), "c1");
    assert.deepEqual(calls.map((c) => `${c.method} ${c.path}`), ["POST /offers/h1/accept", "GET /offers/h1", "GET /offers/h1"]);
  });

  it("answers null when the accept window has closed", async () => {
    const { api } = createFakeOwnerApi({
      "POST /offers/h1/accept": () => {
        throw new OwnerApiError(409, "offer_expired", "Too late.");
      },
    });
    assert.equal(await createLiveOffersService(api).accept("h1"), null);
  });

  it("declines with the chosen reason", async () => {
    const { api, calls } = createFakeOwnerApi({
      "POST /offers/h1/decline": { id: "h1", status: "declined" },
      "GET /offers/h1": { ...card, status: "declined", declineReason: "busy" },
    });
    const declined = await createLiveOffersService(api).decline("h1", "busy");
    assert.equal(declined?.declineReason, "busy");
    assert.deepEqual(calls[0]?.body, { reason: "busy" });
  });

  it("has no chat for an offer that is not accepted", async () => {
    const { api } = createFakeOwnerApi({ "GET /offers/h1": card });
    assert.equal(await createLiveOffersService(api).findChat("h1"), null);
  });

  it("lists open and answered requests, newest first", async () => {
    const { api } = createFakeOwnerApi({
      "GET /offers?status=offered&limit=20": [{ ...card, id: "new", offeredAt: "2026-10-31T17:00:00Z" }],
      "GET /offers?status=accepted&limit=20": [card],
      "GET /offers?status=declined&limit=20": [],
      "GET /offers?status=expired&limit=20": [],
    });
    const offers = await createLiveOffersService(api).listOffers();
    assert.deepEqual(offers.map((o) => o.id), ["new", "h1"]);
  });
});
