// Service-area radius: the slider runs 1-20 km (OwAreaSetup.dc.html); the demo starts at
// business.area.radiusKm from shared/data/mock.ts.
import { business } from "../../../shared/data/mock.ts";

export const MIN_RADIUS_KM = 1;
export const MAX_RADIUS_KM = 20;
export const DEFAULT_RADIUS_KM = business.area.radiusKm;

export function clampRadiusKm(radiusKm: number): number {
  return Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, radiusKm));
}
