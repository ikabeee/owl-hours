import type { ISODate, RequestOffer } from "../../../shared/data/types.ts";
import { requestsCopys } from "../copys/requestsCopys.ts";

// Serializable by design: it crosses into the DOM component as props.
export type RequestRowView = {
  id: string;
  title: string;
  subtitle: string;
  statusText: string;
  urgent: boolean;
  isOpen: boolean;
};

const STATUS_TEXT = {
  offered: requestsCopys.statusWaiting,
  accepted: requestsCopys.statusAccepted,
  declined: requestsCopys.statusDeclined,
  expired: requestsCopys.statusExpired,
} as const;

export function requestRow(offer: RequestOffer, now: ISODate): RequestRowView {
  const isOpen = offer.status === "offered" && Date.parse(offer.expiresAt) > Date.parse(now);
  const status = offer.status === "offered" && !isOpen ? "expired" : offer.status;
  return {
    id: offer.id,
    title: offer.title,
    subtitle: offer.distanceKm > 0 ? `${offer.customerName} · ${offer.distanceKm} km` : offer.customerName,
    statusText: STATUS_TEXT[status],
    urgent: offer.urgent,
    isOpen,
  };
}
