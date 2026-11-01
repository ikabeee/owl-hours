import { useCallback, useEffect, useState } from "react";
import { business } from "../../../shared/data/mock.ts";
import type { ISODate } from "../../../shared/data/types.ts";
import { requestsListView } from "../lib/requestsList.ts";
import type { RequestsListView } from "../lib/requestsList.ts";
import { initialRequestsLoadState, requestsLoadReducer } from "../lib/requestsLoadState.ts";
import type { RequestsLoadState } from "../lib/requestsLoadState.ts";
import type { OffersService } from "../services/offersService.ts";
import { createRequestsRuntime } from "./requestsRuntime.ts";

const TICK_MS = 1000;

export type RequestsDeps = {
  service: OffersService;
  clock: () => ISODate;
  isTakingRequests: boolean; // display-only until the switch writes to the business
};

// "loading" draws nothing; "failed" draws the error state and retries the load;
// "ready" draws the rows, with refreshFailed marking a stale reload that kept them.
export type RequestsList =
  | { status: "loading" }
  | { status: "failed"; retry: () => Promise<void> }
  | { status: "ready"; view: RequestsListView; refreshFailed: boolean; retry: () => Promise<void> };

// `reload` refetches without clearing the rows shown; a failed reload keeps the
// rows and only marks refreshFailed so the screen shows a small notice.
export type RequestsListResult = { requests: RequestsList; reload: () => void };

// Pass stable deps (module constants or memoized): changing them reloads the list.
export function useRequests(deps?: Partial<RequestsDeps>): RequestsListResult {
  const [defaults] = useState(createDefaultDeps);
  const service = deps?.service ?? defaults.service;
  const clock = deps?.clock ?? defaults.clock;
  const isTakingRequests = deps?.isTakingRequests ?? defaults.isTakingRequests;

  const [loaded, setLoaded] = useState<RequestsLoadState>(initialRequestsLoadState);
  const [now, setNow] = useState(clock);
  const [reloadToken, setReloadToken] = useState(0);
  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let isCurrent = true;
    service
      .listOffers()
      .then((offers) => {
        if (isCurrent) setLoaded((shown) => requestsLoadReducer(shown, { kind: "loaded", offers }));
      })
      .catch(() => {
        if (isCurrent) setLoaded((shown) => requestsLoadReducer(shown, { kind: "failed" }));
      });
    return () => {
      isCurrent = false;
    };
  }, [service, reloadToken]);

  useEffect(() => {
    const timer = setInterval(() => setNow(clock()), TICK_MS);
    return () => clearInterval(timer);
  }, [clock]);

  return { requests: toRequestsList(loaded, now, isTakingRequests, reload), reload };
}

function toRequestsList(
  loaded: RequestsLoadState,
  now: ISODate,
  isTakingRequests: boolean,
  reload: () => void,
): RequestsList {
  if (loaded.status === "loading") return { status: "loading" };
  if (loaded.status === "failed") return { status: "failed", retry: async () => reload() };
  return {
    status: "ready",
    view: requestsListView(loaded.offers, now, isTakingRequests),
    refreshFailed: loaded.refreshFailed,
    retry: async () => reload(),
  };
}

function createDefaultDeps(): RequestsDeps {
  return { ...createRequestsRuntime(), isTakingRequests: business.takingRequests };
}
