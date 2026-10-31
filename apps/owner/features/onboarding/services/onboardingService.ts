// Onboarding demo backend: sign-up code, website import, and the profile/prices/area drafts.
// The fake client is seeded with private copies of the demo business and owner
// (structuredClone, never mutating the shared mock). Services return states
// (e.g. "wrong_code"), never copy: the screens own the words.
import {
  business as seedBusiness,
  owner as seedOwner,
} from "../../../shared/data/mock.ts";
import type { ExtraFee, PriceItem } from "../../../shared/data/types.ts";

// Typed as string (not the literal): callers compare it against arbitrary user input,
// which is exactly what the locked verify test does with its wrong-code branch.
export const DEMO_CODE: string = "482910";
const IMPORTED_SERVICES = 12;

export type OnboardingProfile = { name: string; category: string; website: string };
export type OnboardingArea = { radiusKm: number };
export type WebsiteImport = { services: number; prices: PriceItem[] };

export type SendCodeResult = { ok: boolean };
export type VerifyCodeResult = { ok: true } | { ok: false; error: "wrong_code" };

export type OnboardingService = {
  sendCode(phone: string): Promise<SendCodeResult>;
  verifyCode(phone: string, code: string): Promise<VerifyCodeResult>;
  importFromWebsite(website: string): Promise<WebsiteImport>;
  getOwnerName(): Promise<string>;
  saveOwnerName(name: string): Promise<void>;
  getLastPhone(): Promise<{ phone: string; sentAt: string }>;
  getProfile(): Promise<OnboardingProfile>;
  saveProfile(profile: OnboardingProfile): Promise<void>;
  getPrices(): Promise<PriceItem[]>;
  savePrices(prices: PriceItem[]): Promise<void>;
  getFees(): Promise<ExtraFee[]>;
  getArea(): Promise<OnboardingArea>;
  saveArea(area: OnboardingArea): Promise<void>;
  getHoursSummary(): Promise<string>;
  getNightUrgent(): Promise<boolean>;
  setNightUrgent(nightUrgent: boolean): Promise<void>;
};

export type OnboardingDeps = { now: () => string };

export type OnboardingClient = {
  findOwnerName(): Promise<string | null>;
  saveOwnerName(name: string): Promise<void>;
  findPhone(): Promise<{ phone: string; sentAt: string } | null>;
  savePhone(entry: { phone: string; sentAt: string }): Promise<void>;
  checkCode(code: string): Promise<boolean>;
  importPrices(): Promise<WebsiteImport>;
  findProfile(): Promise<OnboardingProfile | null>;
  saveProfile(profile: OnboardingProfile): Promise<void>;
  findPrices(): Promise<PriceItem[] | null>;
  savePrices(prices: PriceItem[]): Promise<void>;
  findArea(): Promise<{ radiusKm: number; nightUrgent: boolean } | null>;
  saveArea(area: { radiusKm: number; nightUrgent: boolean }): Promise<void>;
};

export function createOnboardingService(
  client: OnboardingClient,
  deps: Partial<OnboardingDeps> = {},
): OnboardingService {
  const { now } = { ...createDefaultDeps(), ...deps };

  return {
    sendCode: (phone) => sendCode(client, now, phone),
    verifyCode: (phone, code) => verifyCode(client, phone, code),
    importFromWebsite: () => client.importPrices(),
    getOwnerName: async () => (await client.findOwnerName()) ?? seedOwner.name,
    saveOwnerName: (name) => client.saveOwnerName(name),
    getLastPhone: () => lastPhone(client),
    getProfile: () => currentProfile(client),
    saveProfile: (profile) => client.saveProfile(profile),
    getPrices: () => currentPrices(client),
    savePrices: (prices) => client.savePrices(prices),
    getFees: async () => structuredClone(seedBusiness.fees),
    getArea: () => currentArea(client),
    saveArea: (area) => keepNightUrgent(client, area),
    getHoursSummary: async () => seedBusiness.hours.summary,
    getNightUrgent: async () => (await storedArea(client)).nightUrgent,
    setNightUrgent: (nightUrgent) => storeNightUrgent(client, nightUrgent),
  };
}

// In-memory client seeded with private copies of the demo owner, business, prices and area.
export function createFakeOnboardingClient(): OnboardingClient {
  let ownerName: string | null = null;
  let phone: { phone: string; sentAt: string } | null = null;
  let profile: OnboardingProfile | null = null;
  let prices: PriceItem[] | null = null;
  let area: { radiusKm: number; nightUrgent: boolean } | null = null;

  return {
    findOwnerName: async () => ownerName,
    saveOwnerName: async (name) => {
      ownerName = name;
    },
    findPhone: async () => structuredClone(phone),
    savePhone: async (entry) => {
      phone = structuredClone(entry);
    },
    checkCode: async (code) => code === DEMO_CODE,
    importPrices: async () => ({
      services: IMPORTED_SERVICES,
      prices: structuredClone(seedBusiness.prices),
    }),
    findProfile: async () => structuredClone(profile),
    saveProfile: async (next) => {
      profile = structuredClone(next);
    },
    findPrices: async () => structuredClone(prices),
    savePrices: async (next) => {
      prices = structuredClone(next);
    },
    findArea: async () => structuredClone(area),
    saveArea: async (next) => {
      area = structuredClone(next);
    },
  };
}

// The demo default every hook shares, so data entered on one step is there on the next:
// profile -> prices -> area -> live shows the business name and radius.
export const demoOnboardingService: OnboardingService = createOnboardingService(
  createFakeOnboardingClient(),
);

async function sendCode(
  client: OnboardingClient,
  now: () => string,
  phone: string,
): Promise<SendCodeResult> {
  if (phone.trim() === "") return { ok: false };

  await client.savePhone({ phone, sentAt: now() });
  return { ok: true };
}

// The fake checks the code only: the locked tests verify without sending first,
// so no prior send may be required here.
async function verifyCode(
  client: OnboardingClient,
  _phone: string,
  code: string,
): Promise<VerifyCodeResult> {
  if (await client.checkCode(code)) return { ok: true };

  return { ok: false, error: "wrong_code" };
}

async function lastPhone(client: OnboardingClient): Promise<{ phone: string; sentAt: string }> {
  return (
    (await client.findPhone()) ?? { phone: seedOwner.phone, sentAt: new Date(0).toISOString() }
  );
}

async function currentProfile(client: OnboardingClient): Promise<OnboardingProfile> {
  return (
    (await client.findProfile()) ?? {
      name: seedBusiness.name,
      category: seedBusiness.category,
      website: seedBusiness.website ?? "",
    }
  );
}

async function currentPrices(client: OnboardingClient): Promise<PriceItem[]> {
  return (await client.findPrices()) ?? structuredClone(seedBusiness.prices);
}

async function currentArea(client: OnboardingClient): Promise<OnboardingArea> {
  return { radiusKm: (await storedArea(client)).radiusKm };
}

async function storedArea(
  client: OnboardingClient,
): Promise<{ radiusKm: number; nightUrgent: boolean }> {
  return (
    (await client.findArea()) ?? {
      radiusKm: seedBusiness.area.radiusKm,
      nightUrgent: seedBusiness.hours.nightUrgent,
    }
  );
}

// saveArea keeps the exact { radiusKm } shape the area step owns; the night switch
// persists alongside it without leaking into that shape.
async function keepNightUrgent(
  client: OnboardingClient,
  area: OnboardingArea,
): Promise<void> {
  await client.saveArea({ ...area, nightUrgent: (await storedArea(client)).nightUrgent });
}

async function storeNightUrgent(client: OnboardingClient, nightUrgent: boolean): Promise<void> {
  await client.saveArea({ ...(await storedArea(client)), nightUrgent });
}

function createDefaultDeps(): OnboardingDeps {
  return { now: () => new Date().toISOString() };
}
