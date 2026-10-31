// Spec: odd/tasks/owner-onboarding.md, S3–S6; unit T7, test file 6.
// Fake client seeded from shared/data/mock.ts; every test builds its own service so
// state never leaks. Demo values verbatim from mock.ts; the error string verbatim
// from HANDOFF-RN-UI §Verify. The fakes must not mutate the shared mock: tests
// assert against a structuredClone of it.
// Q (operator): the HTML shows a half-filled code (4 8 2 9 1 _) but no complete demo
// code — which demo code should verifyCode accept? The tests use the DEMO_CODE export.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { business as mockBusiness, owner as mockOwner } from "../../../shared/data/mock.ts";
import {
  DEMO_CODE,
  createFakeOnboardingClient,
  createOnboardingService,
} from "./onboardingService.ts";

function buildService() {
  return createOnboardingService(createFakeOnboardingClient());
}

describe("onboardingService.sendCode", () => {
  it("sends a code to the demo number", async () => {
    assert.deepEqual(await buildService().sendCode(mockOwner.phone), { ok: true });
  });

  it("fails for a missing number", async () => {
    assert.equal((await buildService().sendCode("")).ok, false);
  });
});

describe("onboardingService.verifyCode", () => {
  it("uses 482910 as the demo code", () => {
    assert.equal(DEMO_CODE, "482910");
  });

  it("succeeds with the demo code", async () => {
    assert.deepEqual(await buildService().verifyCode(mockOwner.phone, DEMO_CODE), { ok: true });
  });

  it("fails with the error state for a wrong code", async () => {
    const wrongCode = DEMO_CODE === "000000" ? "111111" : "000000";

    assert.deepEqual(await buildService().verifyCode(mockOwner.phone, wrongCode), {
      ok: false,
      error: "wrong_code",
    });
  });
});

describe("onboardingService.importFromWebsite", () => {
  it("reports 12 services and the 4 demo prices", async () => {
    const imported = await buildService().importFromWebsite(mockBusiness.website ?? "");

    assert.equal(imported.services, 12);
    assert.deepEqual(imported.prices, structuredClone(mockBusiness.prices));
    assert.equal(imported.prices.length, 4);
  });
});

describe("onboardingService round-trips", () => {
  it("profile round-trips", async () => {
    const service = buildService();
    const profile = { name: "Northside Plumbing", category: "plumbing", website: "northside-plumbing.example" };

    await service.saveProfile(profile);

    assert.deepEqual(await service.getProfile(), profile);
  });

  it("prices round-trip", async () => {
    const service = buildService();

    await service.savePrices(structuredClone(mockBusiness.prices));

    assert.deepEqual(await service.getPrices(), mockBusiness.prices);
  });

  it("area round-trips", async () => {
    const service = buildService();

    await service.saveArea({ radiusKm: 8 });

    assert.deepEqual(await service.getArea(), { radiusKm: 8 });
  });
});

describe("onboardingService isolation", () => {
  it("does not mutate the shared mock", async () => {
    const before = structuredClone({ business: mockBusiness, owner: mockOwner });
    const service = buildService();

    await service.sendCode(mockOwner.phone);
    await service.verifyCode(mockOwner.phone, DEMO_CODE);
    await service.importFromWebsite(mockBusiness.website ?? "");
    await service.saveProfile({ name: "Changed", category: "plumbing", website: "x.example" });
    await service.savePrices([]);
    await service.saveArea({ radiusKm: 8 });

    assert.deepEqual({ business: mockBusiness, owner: mockOwner }, before);
  });
});
