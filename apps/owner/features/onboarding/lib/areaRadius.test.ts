// Spec: odd/tasks/owner-onboarding.md, S5; unit T7, test file 5.
// Slider range 1–20 km from OwAreaSetup.dc.html (`min="1" max="20" value="5"`);
// the demo starts at business.area.radiusKm from shared/data/mock.ts.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { business } from "../../../shared/data/mock.ts";
import { DEFAULT_RADIUS_KM, MAX_RADIUS_KM, MIN_RADIUS_KM, clampRadiusKm } from "./areaRadius.ts";

describe("clampRadiusKm", () => {
  it("clamps below 1 km up to 1", () => {
    assert.equal(clampRadiusKm(0), 1);
    assert.equal(clampRadiusKm(-5), 1);
  });

  it("clamps above 20 km down to 20", () => {
    assert.equal(clampRadiusKm(21), 20);
    assert.equal(clampRadiusKm(100), 20);
  });

  it("keeps values inside 1–20 km unchanged", () => {
    assert.equal(clampRadiusKm(1), 1);
    assert.equal(clampRadiusKm(5), 5);
    assert.equal(clampRadiusKm(20), 20);
  });

  it("exposes the 1–20 km bounds", () => {
    assert.equal(MIN_RADIUS_KM, 1);
    assert.equal(MAX_RADIUS_KM, 20);
  });
});

describe("demo radius", () => {
  it("starts at business.area.radiusKm (5)", () => {
    assert.equal(DEFAULT_RADIUS_KM, business.area.radiusKm);
    assert.equal(DEFAULT_RADIUS_KM, 5);
  });
});
