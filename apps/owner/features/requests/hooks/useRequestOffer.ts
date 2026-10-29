import { useEffect, useState } from "react";
import { DEMO_NOW, business } from "../../../shared/data/mock.ts";
import type { ID, OfferStatus, RequestOffer } from "../../../shared/data/types.ts";
import { acceptWindowSeconds, formatCountdown, secondsLeft } from "../lib/countdown.ts";
import { createFakeOffersClient, createOffersService } from "../services/offersService.ts";
import type { OffersService } from "../services/offersService.ts";

const TICK_MS = 1000;

export type RequestOfferDeps = {
  service: OffersService;
  clock: () => string; // current instant as an ISO date
  acceptWindowMin: { urgent: number; other: number };
};

// Serializable by design: it crosses into the DOM component as props.
export type RequestOfferView = {
  offer: Pick<RequestOffer, "title" | "customerName" | "distanceKm" | "zukkiSummary">;
  status: OfferStatus;
  countdownText: string;
  secondsLeft: number;
  maxSeconds: number;
  isExpired: boolean;
  accept: () => Promise<boolean>; // false when the offer was no longer "offered"
  decline: () => Promise<boolean>;
};

// Returns null while the offer loads, or when it does not exist.
// Pass stable deps (module constants or memoized): changing them restarts the clock.
export function useRequestOffer(id: ID, deps?: Partial<RequestOfferDeps>): RequestOfferView | null {
  const [defaults] = useState(createDemoDeps);
  const service = deps?.service ?? defaults.service;
  const clock = deps?.clock ?? defaults.clock;
  const acceptWindowMin = deps?.acceptWindowMin ?? defaults.acceptWindowMin;

  const [offer, setOffer] = useState<RequestOffer | null>(null);
  const [now, setNow] = useState(clock);

  useEffect(() => {
    let isCurrent = true;
    service.getOffer(id).then((loaded) => {
      if (isCurrent) setOffer(loaded);
    });
    return () => {
      isCurrent = false;
    };
  }, [service, id]);

  useEffect(() => {
    const timer = setInterval(() => setNow(clock()), TICK_MS);
    return () => clearInterval(timer);
  }, [clock]);

  async function answer(transition: (id: ID) => Promise<RequestOffer | null>) {
    const answered = await transition(id);
    if (!answered) return false;

    setOffer(answered);
    return true;
  }

  if (!offer) return null;

  const remaining = secondsLeft(offer.expiresAt, now);
  return {
    offer,
    status: offer.status,
    countdownText: formatCountdown(remaining),
    secondsLeft: remaining,
    maxSeconds: acceptWindowSeconds(offer.urgent, acceptWindowMin),
    isExpired: remaining === 0,
    accept: () => answer(service.accept),
    decline: () => answer(service.decline),
  };
}

function createDemoDeps(): RequestOfferDeps {
  return {
    service: createOffersService(createFakeOffersClient()),
    clock: createDemoClock(),
    acceptWindowMin: business.acceptWindowMin,
  };
}

// The demo offer expires in 2026, so the clock starts at DEMO_NOW and advances with real time since mount.
function createDemoClock(): () => string {
  const startedAt = Date.now();
  const demoStart = Date.parse(DEMO_NOW);
  return () => new Date(demoStart + (Date.now() - startedAt)).toISOString();
}
