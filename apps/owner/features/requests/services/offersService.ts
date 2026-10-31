import { conversations as seedConversations, offers as seedOffers } from "../../../shared/data/mock.ts";
import type { DeclineReason, ID, OfferStatus, RequestOffer } from "../../../shared/data/types.ts";

export type OffersClient = {
  findOffer(id: ID): Promise<RequestOffer | null>;
  saveOffer(offer: RequestOffer): Promise<void>;
  findConversationId(offerId: ID): Promise<ID | null>;
};

export type OffersService = {
  getOffer(id: ID): Promise<RequestOffer | null>;
  accept(id: ID): Promise<RequestOffer | null>;
  decline(id: ID, reason?: DeclineReason): Promise<RequestOffer | null>;
  findChat(offerId: ID): Promise<ID | null>; // the conversation an accepted offer opened
};

export function createOffersService(client: OffersClient): OffersService {
  return {
    getOffer: (id) => client.findOffer(id),
    accept: (id) => moveOfferedTo(client, id, "accepted"),
    decline: (id, reason) => moveOfferedTo(client, id, "declined", reason),
    findChat: (offerId) => findChatOfAccepted(client, offerId),
  };
}

// In-memory client seeded with a private copy of the demo offers and their conversations.
export function createFakeOffersClient(): OffersClient {
  const offersById = new Map(structuredClone(seedOffers).map((offer) => [offer.id, offer]));
  const conversationIdByOfferId = new Map(seedConversations.map((conversation) => [conversation.offerId, conversation.id]));

  return {
    findOffer: async (id) => structuredClone(offersById.get(id) ?? null),
    saveOffer: async (offer) => {
      offersById.set(offer.id, structuredClone(offer));
    },
    findConversationId: async (offerId) => conversationIdByOfferId.get(offerId) ?? null,
  };
}

// Only an offer that is still "offered" can be answered; anything else yields null.
// A decline keeps the chosen sheet reason, so Requests can read it back.
async function moveOfferedTo(
  client: OffersClient,
  id: ID,
  status: OfferStatus,
  declineReason?: DeclineReason,
): Promise<RequestOffer | null> {
  const offer = await client.findOffer(id);
  if (offer?.status !== "offered") return null;

  const answered: RequestOffer = declineReason === undefined ? { ...offer, status } : { ...offer, status, declineReason };
  await client.saveOffer(answered);
  return answered;
}

// Only an accepted offer has a chat to open.
async function findChatOfAccepted(client: OffersClient, offerId: ID): Promise<ID | null> {
  const offer = await client.findOffer(offerId);
  if (offer?.status !== "accepted") return null;

  return client.findConversationId(offerId);
}
