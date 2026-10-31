import type { Business } from "../../../shared/data/types.ts";
import { businessRows } from "../lib/businessRows.ts";
import type { BusinessDemo, BusinessRowValues } from "../lib/businessRows.ts";
import { demoBusinessService } from "../services/businessService.ts";
import type { BusinessService } from "../services/businessService.ts";
import { useLoad } from "./useLoad.ts";

export type BusinessDeps = { service: BusinessService };

// Serializable by design: it crosses into the DOM component as props.
export type BusinessView = {
  name: string;
  rows: BusinessRowValues;
};

export type BusinessState =
  | { status: "loading"; reload: () => Promise<void> }
  | { status: "failed"; retry: () => Promise<void>; reload: () => Promise<void> }
  | { status: "ready"; view: BusinessView; reload: () => Promise<void> };

// The demo business always exists, so there is no empty state: loading draws
// nothing (it resolves under 300 ms) and failure draws the error state.
// reload re-reads the shared demo service; the business route calls it on
// every focus so saved prices are visible when coming back from OwPrices.
export function useBusiness(deps?: Partial<BusinessDeps>): BusinessState {
  const service = deps?.service ?? demoBusinessService;
  const { state, reload } = useLoad(() => loadBusiness(service), [service]);

  if (state.status === "loading") return { status: "loading", reload };
  if (state.status === "failed") return { status: "failed", retry: state.retry, reload };

  return {
    status: "ready",
    view: { name: state.value.business.name, rows: businessRows(state.value.business, state.value.demo) },
    reload,
  };
}

async function loadBusiness(
  service: BusinessService,
): Promise<{ business: Business; demo: BusinessDemo } | { failed: true }> {
  try {
    const [business, demo] = await Promise.all([service.getBusiness(), service.getDemoValues()]);
    return { business, demo };
  } catch {
    return { failed: true };
  }
}
