import { DEMO_NOW } from "../../../shared/data/mock.ts";
import type { ISODate } from "../../../shared/data/types.ts";
import { getOwnerLiveApi } from "../../../shared/infra/ownerApiRuntime";
import { createOffersApiClient } from "../services/offersApiClient.ts";
import { createFakeOffersClient, createOffersService } from "../services/offersService.ts";
import type { OffersService } from "../services/offersService.ts";

// What the requests hooks run on by default.
export type RequestsRuntime = { service: OffersService; clock: () => ISODate };

let liveRuntime: RequestsRuntime | null = null;

// Composition root of the requests hooks. Live: one service shared by every screen, so an
// answer given on the detail shows on the list, on the real clock. Demo: as before, every
// mount gets its own fake offers and a clock that starts at DEMO_NOW, so the demo replays.
export function createRequestsRuntime(): RequestsRuntime {
  return getLiveRuntime() ?? { service: createOffersService(createFakeOffersClient()), clock: createDemoClock() };
}

function getLiveRuntime(): RequestsRuntime | null {
  if (liveRuntime) return liveRuntime;

  const api = getOwnerLiveApi();
  if (!api) return null;
  liveRuntime = { service: createOffersService(createOffersApiClient(api)), clock: () => new Date().toISOString() };
  return liveRuntime;
}

// The demo offer expires in 2026, so the clock starts at DEMO_NOW and advances with real time since mount.
function createDemoClock(): () => ISODate {
  const startedAt = Date.now();
  const demoStart = Date.parse(DEMO_NOW);
  return () => new Date(demoStart + (Date.now() - startedAt)).toISOString();
}
