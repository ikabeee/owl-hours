// Regression: the hooks share one module-level demo service, so a price saved
// in OwPrices (or a switch flipped in OwSettings) is still there when another
// business screen reads through the same export.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { demoBusinessService } from "./businessService.ts";

describe("demoBusinessService", () => {
  it("persists saved prices for later reads through the same export", async () => {
    const before = (await demoBusinessService.getBusiness()).prices;
    const updated = structuredClone(before);
    updated[0] = { ...updated[0], amount: before[0].amount + 1 };

    const saved = await demoBusinessService.savePrices(updated);
    try {
      assert.notEqual(saved, null);
      assert.deepEqual((await demoBusinessService.getBusiness()).prices, updated);
    } finally {
      await demoBusinessService.savePrices(before);
    }
  });

  it("persists saved settings for later reads through the same export", async () => {
    const before = await demoBusinessService.getSettings();
    const flipped = { ...before, takingRequests: !before.takingRequests };

    const saved = await demoBusinessService.saveSettings(flipped);
    try {
      assert.deepEqual(saved, flipped);
      assert.deepEqual(await demoBusinessService.getSettings(), flipped);
    } finally {
      await demoBusinessService.saveSettings(before);
    }
  });
});
