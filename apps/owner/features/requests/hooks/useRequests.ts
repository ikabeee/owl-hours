import { useCallback, useEffect, useState } from "react";
import { business } from "../../../shared/data/mock.ts";
import type { ISODate } from "../../../shared/data/types.ts";
import { requestsListView } from "../lib/requestsList.ts";
import type { RequestsListView } from "../lib/requestsList.ts";
import type { Offer, OffersService } from "../services/offersService.ts";
import { createRequestsRuntime } from "./requestsRuntime.ts";

const TICK_MS = 1000;

export type RequestsDeps = {
  service: OffersService;
  clock: () => ISODate;
  isTakingRequests: boolean; // display-only until the switch writes to the business
};

// The list is null while it loads. `reload` refetches without clearing the current view.
export type RequestsListResult = { requests: RequestsListView | null; reload: () => void };

// Pass stable deps (module constants or memoized): changing them reloads the list.
export function useRequests(deps?: Partial<RequestsDeps>): RequestsListResult {
  const [defaults] = useState(createDefaultDeps);
  const service = deps?.service ?? defaults.service;
  const clock = deps?.clock ?? defaults.clock;
  const isTakingRequests = deps?.isTakingRequests ?? defaults.isTakingRequests;

  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [now, setNow] = useState(clock);
  const [reloadToken, setReloadToken] = useState(0);
  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let isCurrent = true;
    service
      .listOffers()
      .then((loaded) => {
        if (isCurrent) setOffers(loaded);
      })
      .catch(() => {
        if (isCurrent) setOffers([]);
      });
    return () => {
      isCurrent = false;
    };
  }, [service, reloadToken]);

  useEffect(() => {
    const timer = setInterval(() => setNow(clock()), TICK_MS);
    return () => clearInterval(timer);
  }, [clock]);

  if (!offers) return { requests: null, reload };

  return { requests: requestsListView(offers, now, isTakingRequests), reload };
}

function createDefaultDeps(): RequestsDeps {
  return { ...createRequestsRuntime(), isTakingRequests: business.takingRequests };
}
