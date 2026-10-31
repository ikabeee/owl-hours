// Setup step 2 (prices): the imported price draft and fees, plus the save that moves
// the flow to the area step. New rows are a DOM-local draft until Continue saves them.
import { useEffect, useState } from "react";
import type { ExtraFee, PriceItem } from "../../../shared/data/types.ts";
import { demoOnboardingService } from "../services/onboardingService.ts";
import type { OnboardingService } from "../services/onboardingService.ts";

export type PricesDeps = { service: OnboardingService };

export type PricesView = {
  prices: PriceItem[];
  fees: ExtraFee[];
  savePrices: (prices: PriceItem[]) => Promise<void>;
};

export type Prices =
  | { status: "loading" }
  | { status: "failed"; retry: () => Promise<void> }
  | { status: "ready"; view: PricesView };

export function usePrices(deps?: Partial<PricesDeps>): Prices {
  const [defaults] = useState(createDemoDeps);
  const service = deps?.service ?? defaults.service;

  const [prices, setPrices] = useState<PriceItem[] | null>(null);
  const [fees, setFees] = useState<ExtraFee[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setFailed(false);
    Promise.all([service.getPrices(), service.getFees()]).then(
      ([loadedPrices, loadedFees]) => {
        if (!isCurrent) return;
        setPrices(loadedPrices);
        setFees(loadedFees);
      },
      () => {
        if (isCurrent) setFailed(true);
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [service, attempt]);

  if (failed) return { status: "failed", retry: relaunch };
  if (prices === null || fees === null) return { status: "loading" };

  return {
    status: "ready",
    view: {
      prices,
      fees,
      savePrices: (next) => service.savePrices(next),
    },
  };

  async function relaunch(): Promise<void> {
    setAttempt((count) => count + 1);
  }
}

function createDemoDeps(): PricesDeps {
  return { service: demoOnboardingService };
}
