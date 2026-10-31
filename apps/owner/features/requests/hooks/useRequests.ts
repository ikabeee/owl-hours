import { useCallback, useEffect, useState } from "react";
import { liveOwnerApi } from "../../../lib/liveOwnerApi";
import { DEMO_NOW, offers as demoOffers } from "../../../shared/data/mock.ts";
import type { RequestOffer } from "../../../shared/data/types.ts";
import { requestRow } from "../lib/requestRow.ts";
import type { RequestRowView } from "../lib/requestRow.ts";
import { createLiveOffersService } from "../services/offersLive.ts";

// Live mode checks for new requests this often while the inbox is open.
const POLL_MS = 15_000;

// The rows are null while they first load; `reload` refetches without clearing them.
export type RequestsResult = { rows: RequestRowView[] | null; reload: () => void };

export function useRequests(): RequestsResult {
  const [source] = useState(createSource);
  const [offers, setOffers] = useState<RequestOffer[] | null>(null);
  const [token, setToken] = useState(0);
  const reload = useCallback(() => setToken((value) => value + 1), []);

  useEffect(() => {
    let isCurrent = true;
    source
      .list()
      .then((loaded) => isCurrent && setOffers(loaded))
      .catch(() => isCurrent && setOffers((current) => current ?? []));
    return () => {
      isCurrent = false;
    };
  }, [source, token]);

  useEffect(() => {
    if (!source.live) return;
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [source, reload]);

  if (!offers) return { rows: null, reload };
  const now = source.now();
  return { rows: offers.map((offer) => requestRow(offer, now)), reload };
}

function createSource() {
  const api = liveOwnerApi();
  if (api) {
    const service = createLiveOffersService(api);
    return { live: true, list: () => service.listOffers(), now: () => new Date().toISOString() };
  }
  return { live: false, list: async () => structuredClone(demoOffers), now: () => DEMO_NOW };
}
