import { useEffect, useState } from "react";
import { DEMO_NOW, business } from "../../../shared/data/mock.ts";
import type { DeclineReason, ID, OfferStatus, PossibleFault, RequestOffer } from "../../../shared/data/types.ts";
import type { AcceptOutcome } from "../lib/acceptOutcome.ts";
import { acceptWindowSeconds, formatCountdown, secondsLeft } from "../lib/countdown.ts";
import { requestFaults } from "../lib/requestFaults.ts";
import { createFakeOffersClient, createOffersService } from "../services/offersService.ts";
import type { OffersService } from "../services/offersService.ts";

const TICK_MS = 1000;

export type RequestOfferDeps = {
  service: OffersService;
  clock: () => string; // current instant as an ISO date
  acceptWindowMin: { urgent: number; other: number };
};

export type RequestOfferDetails = Pick<
  RequestOffer,
  "title" | "customerName" | "distanceKm" | "zukkiSummary" | "media" | "customerQuote" | "offeredAt"
> & { possibleFaults: PossibleFault[] };

// Serializable by design: it crosses into the DOM component as props.
export type RequestOfferView = {
  offer: RequestOfferDetails;
  status: OfferStatus;
  countdownText: string;
  secondsLeft: number;
  maxSeconds: number;
  isExpired: boolean;
  accept: () => Promise<AcceptOutcome>;
  decline: (reason?: DeclineReason) => Promise<boolean>;
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

  async function answer(transition: () => Promise<RequestOffer | null>) {
    const answered = await transition();
    if (!answered) return false;

    setOffer(answered);
    return true;
  }

  async function acceptAndFindChat(): Promise<AcceptOutcome> {
    if (!(await answer(() => service.accept(id)))) return { kind: "not-offered" };

    return { kind: "accepted", chatId: await service.findChat(id) };
  }

  if (!offer) return null;

  const remaining = secondsLeft(offer.expiresAt, now);
  return {
    offer: { ...offer, possibleFaults: requestFaults(offer) },
    status: offer.status,
    countdownText: formatCountdown(remaining),
    secondsLeft: remaining,
    maxSeconds: acceptWindowSeconds(offer.urgent, acceptWindowMin),
    isExpired: remaining === 0,
    accept: acceptAndFindChat,
    decline: (reason) => answer(() => service.decline(id, reason)),
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
