import type { ExtraFee, PriceItem } from "../../../shared/data/types.ts";
import { demoBusinessService } from "../services/businessService.ts";
import type { BusinessService } from "../services/businessService.ts";
import { useLoad } from "./useLoad.ts";

export type PricesDeps = { service: BusinessService };

// Serializable by design: it crosses into the DOM component as props; saving
// is a top-level async callback. An empty price list is not a load state: the
// screen draws its empty variant over the ready view.
export type PricesView = {
  prices: PriceItem[];
  fees: ExtraFee[];
  savePrices: (prices: PriceItem[]) => Promise<boolean>;
};

export type PricesState =
  | { status: "loading"; reload: () => Promise<void> }
  | { status: "failed"; retry: () => Promise<void>; reload: () => Promise<void> }
  | { status: "ready"; view: PricesView; reload: () => Promise<void> };

export function usePrices(deps?: Partial<PricesDeps>): PricesState {
  const service = deps?.service ?? demoBusinessService;
  const { state, reload, replace } = useLoad(() => loadPrices(service), [service]);

  if (state.status === "loading") return { status: "loading", reload };
  if (state.status === "failed") return { status: "failed", retry: state.retry, reload };

  async function savePrices(prices: PriceItem[]): Promise<boolean> {
    const saved = await service.savePrices(prices);
    if (!saved) return false;

    replace({ prices: saved.prices, fees: saved.fees });
    return true;
  }

  return { status: "ready", view: { prices: state.value.prices, fees: state.value.fees, savePrices }, reload };
}

async function loadPrices(
  service: BusinessService,
): Promise<{ prices: PriceItem[]; fees: ExtraFee[] } | { failed: true }> {
  try {
    const business = await service.getBusiness();
    return { prices: business.prices, fees: business.fees };
  } catch {
    return { failed: true };
  }
}
