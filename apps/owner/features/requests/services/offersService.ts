import { offers as seedOffers } from "../../../shared/data/mock.ts";
import type { ID, OfferStatus, RequestOffer } from "../../../shared/data/types.ts";

export type OffersClient = {
  findOffer(id: ID): Promise<RequestOffer | null>;
  saveOffer(offer: RequestOffer): Promise<void>;
};

export type OffersService = {
  getOffer(id: ID): Promise<RequestOffer | null>;
  accept(id: ID): Promise<RequestOffer | null>;
  decline(id: ID): Promise<RequestOffer | null>;
};

export function createOffersService(client: OffersClient): OffersService {
  return {
    getOffer: (id) => client.findOffer(id),
    accept: (id) => moveOfferedTo(client, id, "accepted"),
    decline: (id) => moveOfferedTo(client, id, "declined"),
  };
}

// In-memory client seeded with a private copy of the demo offers.
export function createFakeOffersClient(): OffersClient {
  const offersById = new Map(structuredClone(seedOffers).map((offer) => [offer.id, offer]));

  return {
    findOffer: async (id) => structuredClone(offersById.get(id) ?? null),
    saveOffer: async (offer) => {
      offersById.set(offer.id, structuredClone(offer));
    },
  };
}

// Only an offer that is still "offered" can be answered; anything else yields null.
async function moveOfferedTo(client: OffersClient, id: ID, status: OfferStatus): Promise<RequestOffer | null> {
  const offer = await client.findOffer(id);
  if (offer?.status !== "offered") return null;

  const answered = { ...offer, status };
  await client.saveOffer(answered);
  return answered;
}
