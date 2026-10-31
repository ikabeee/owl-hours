// Regression: the default-deps hooks share one demo service, so a profile saved
// through the singleton is visible to a fresh read.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { demoOnboardingService } from "./onboardingService.ts";

describe("demoOnboardingService sharing", () => {
  it("saveProfile then a fresh getProfile round-trips", async () => {
    const profile = { name: "Northside Plumbing", category: "plumbing", website: "northside-plumbing.example" };

    await demoOnboardingService.saveProfile(profile);

    assert.deepEqual(await demoOnboardingService.getProfile(), profile);
  });
});
