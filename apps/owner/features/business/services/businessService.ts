import { accounts as seedAccounts, business as seedBusiness } from "../../../shared/data/mock.ts";
import type { Business, LinkedAccount, PriceItem } from "../../../shared/data/types.ts";
import type { BusinessDemo } from "../lib/businessRows.ts";
import { BUSINESS_DEMO } from "../lib/businessRows.ts";
import { isValidPrice } from "../lib/priceValidation.ts";

// The settings switches of OwSettings. Field names are the coder's;
// the fake client seeds them on, on, on, off (the HTML aria-checked).
export type BusinessSettings = {
  takingRequests: boolean;
  urgentRequests: boolean;
  ringOnSilentAtNight: boolean;
  polishByDefault: boolean;
};

export type BusinessClient = {
  loadBusiness: () => Promise<Business>;
  storeBusiness: (business: Business) => Promise<void>;
  loadSettings: () => Promise<BusinessSettings>;
  storeSettings: (settings: BusinessSettings) => Promise<void>;
  loadAccounts: () => Promise<LinkedAccount[]>;
  loadDemoValues: () => Promise<BusinessDemo>;
};

export type BusinessService = {
  getBusiness: () => Promise<Business>;
  savePrices: (prices: PriceItem[]) => Promise<Business | null>;
  getSettings: () => Promise<BusinessSettings>;
  saveSettings: (settings: BusinessSettings) => Promise<BusinessSettings>;
  getAccounts: () => Promise<LinkedAccount[]>;
  getDemoValues: () => Promise<BusinessDemo>;
};

export function createBusinessService(client: BusinessClient): BusinessService {
  return {
    getBusiness: () => client.loadBusiness(),
    savePrices: (prices) => saveValidPrices(client, prices),
    getSettings: () => client.loadSettings(),
    saveSettings: (settings) => storeSettings(client, settings),
    getAccounts: () => client.loadAccounts(),
    getDemoValues: () => client.loadDemoValues(),
  };
}

// A price list with a non-positive or fractional amount saves nothing.
async function saveValidPrices(client: BusinessClient, prices: PriceItem[]): Promise<Business | null> {
  if (!prices.every((price) => isValidPrice(price.amount))) return null;

  const updated = { ...(await client.loadBusiness()), prices: structuredClone(prices) };
  await client.storeBusiness(updated);
  return updated;
}

async function storeSettings(client: BusinessClient, settings: BusinessSettings): Promise<BusinessSettings> {
  const saved = { ...settings };
  await client.storeSettings(saved);
  return saved;
}

// Module-level demo service shared by the default deps of useBusiness,
// usePrices and useSettings: saved prices and toggles survive navigation
// between the three screens (each hook built its own client before, so edits
// were lost on every screen change). Tests keep building their own service.
export const demoBusinessService: BusinessService = createBusinessService(createFakeBusinessClient());

// In-memory client seeded with a private copy of the demo business, its
// accounts and the feature-local demo values; the shared mock is never touched.
export function createFakeBusinessClient(): BusinessClient {
  let business = structuredClone(seedBusiness);
  let settings: BusinessSettings = {
    takingRequests: seedBusiness.takingRequests,
    urgentRequests: true,
    ringOnSilentAtNight: true,
    polishByDefault: false,
  };
  const accounts = structuredClone(seedAccounts);
  const demo = structuredClone(BUSINESS_DEMO);

  return {
    loadBusiness: async () => structuredClone(business),
    storeBusiness: async (next) => {
      business = structuredClone(next);
    },
    loadSettings: async () => ({ ...settings }),
    storeSettings: async (next) => {
      settings = { ...next };
    },
    loadAccounts: async () => structuredClone(accounts),
    loadDemoValues: async () => ({ ...demo }),
  };
}
