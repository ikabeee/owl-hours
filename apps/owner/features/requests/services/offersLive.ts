import { OwnerApiError } from "../../../lib/ownerApi.ts";
import type { OwnerApi } from "../../../lib/ownerApi.ts";
import type { DeclineReason, ID, Media, OfferStatus, RequestOffer } from "../../../shared/data/types.ts";
import type { OffersService } from "./offersService.ts";

// One request card from GET /v1/owner/offers(/:id): private.offer_card plus signed media links.
export type ApiOffer = {
  id: ID;
  conversationId: ID;
  status: string;
  urgent: boolean;
  distanceKm: number | null;
  suggestedQuote: { min: number; max: number } | null;
  offeredAt: string;
  expiresAt: string;
  declineReason: string | null;
  title: string | null;
  zukkiSummary: string | null;
  customerName: string | null;
  approxLocation: string | null;
  customerQuote: string | null;
  media: Array<{ kind: string; url: string | null; thumbUrl: string | null; durationMs: number | null }>;
};

export type LiveOffersService = OffersService & { listOffers(): Promise<RequestOffer[]> };

const LIST_STATUSES = ["offered", "accepted", "declined", "expired"] as const;
const DECLINE_REASONS: DeclineReason[] = ["busy", "too_far", "not_offered", "other"];

export function toRequestOffer(api: ApiOffer): RequestOffer {
  const declineReason = DECLINE_REASONS.find((reason) => reason === api.declineReason);
  return {
    id: api.id,
    customerName: api.customerName ?? "Customer",
    title: api.title ?? "New request",
    urgent: api.urgent,
    distanceKm: api.distanceKm ?? 0,
    approxLocation: api.approxLocation ?? "",
    media: api.media.flatMap(toMedia),
    ...(api.customerQuote ? { customerQuote: api.customerQuote } : {}),
    zukkiSummary: api.zukkiSummary ?? "",
    suggestedQuote: api.suggestedQuote ?? { min: 0, max: 0 },
    offeredAt: api.offeredAt,
    expiresAt: api.expiresAt,
    status: toOfferStatus(api.status),
    ...(declineReason ? { declineReason } : {}),
  };
}

// A closed handoff was accepted first; the owner reads it as accepted.
function toOfferStatus(status: string): OfferStatus {
  if (status === "closed") return "accepted";
  return status === "offered" || status === "accepted" || status === "declined" ? status : "expired";
}

function toMedia(media: ApiOffer["media"][number]): Media[] {
  if (!media.url) return [];
  if (media.kind === "video") {
    const duration = media.durationMs === null ? {} : { durationS: Math.round(media.durationMs / 1000) };
    return [{ kind: "video", url: media.url, thumbUrl: media.thumbUrl ?? media.url, ...duration }];
  }
  return media.kind === "image" ? [{ kind: "photo", url: media.url, thumbUrl: media.thumbUrl ?? media.url }] : [];
}

// Accept and decline answer null when the API refuses (the window closed, someone else answered).
export function createLiveOffersService(api: OwnerApi): LiveOffersService {
  async function load(id: ID): Promise<ApiOffer | null> {
    try {
      return await api.get<ApiOffer>(`/offers/${id}`);
    } catch (error) {
      if (error instanceof OwnerApiError && error.status === 404) return null;
      throw error;
    }
  }

  async function answer(id: ID, path: string, body: unknown): Promise<RequestOffer | null> {
    try {
      await api.post(`/offers/${id}/${path}`, body);
    } catch (error) {
      if (error instanceof OwnerApiError && error.status < 500) return null;
      throw error;
    }
    const offer = await load(id);
    return offer && toRequestOffer(offer);
  }

  return {
    getOffer: async (id) => {
      const offer = await load(id);
      return offer && toRequestOffer(offer);
    },
    accept: (id) => answer(id, "accept", {}),
    decline: (id, reason) => answer(id, "decline", { reason: reason ?? "other" }),
    findChat: async (offerId) => {
      const offer = await load(offerId);
      return offer && toOfferStatus(offer.status) === "accepted" ? offer.conversationId : null;
    },
    listOffers: async () => {
      const pages = await Promise.all(LIST_STATUSES.map((status) => api.get<ApiOffer[]>(`/offers?status=${status}&limit=20`)));
      return pages
        .flat()
        .map(toRequestOffer)
        .sort((a, b) => Date.parse(b.offeredAt) - Date.parse(a.offeredAt));
    },
  };
}
