// Setup step 3 (hours and area): the saved radius and night switch, plus the finish
// that persists both and moves the flow to live.
import { useEffect, useState } from "react";
import { clampRadiusKm } from "../lib/areaRadius.ts";
import { demoOnboardingService } from "../services/onboardingService.ts";
import type { OnboardingService } from "../services/onboardingService.ts";

export type AreaDeps = { service: OnboardingService };

export type AreaView = {
  radiusKm: number;
  nightUrgent: boolean;
  hoursSummary: string;
  finish: (radiusKm: number, nightUrgent: boolean) => Promise<void>;
};

export type Area =
  | { status: "loading" }
  | { status: "failed"; retry: () => Promise<void> }
  | { status: "ready"; view: AreaView };

export function useArea(deps?: Partial<AreaDeps>): Area {
  const [defaults] = useState(createDemoDeps);
  const service = deps?.service ?? defaults.service;

  const [saved, setSaved] = useState<{
    radiusKm: number;
    nightUrgent: boolean;
    hoursSummary: string;
  } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setFailed(false);
    Promise.all([service.getArea(), service.getNightUrgent(), service.getHoursSummary()]).then(
      ([area, nightUrgent, hoursSummary]) => {
        if (isCurrent) setSaved({ radiusKm: area.radiusKm, nightUrgent, hoursSummary });
      },
      () => {
        if (isCurrent) setFailed(true);
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [service, attempt]);

  if (failed) return { status: "failed", retry: relaunch };
  if (saved === null) return { status: "loading" };

  return {
    status: "ready",
    view: {
      radiusKm: saved.radiusKm,
      nightUrgent: saved.nightUrgent,
      hoursSummary: saved.hoursSummary,
      finish: (radiusKm, nightUrgent) => finishArea(service, radiusKm, nightUrgent),
    },
  };

  async function relaunch(): Promise<void> {
    setAttempt((count) => count + 1);
  }
}

async function finishArea(
  service: OnboardingService,
  radiusKm: number,
  nightUrgent: boolean,
): Promise<void> {
  await service.saveArea({ radiusKm: clampRadiusKm(radiusKm) });
  await service.setNightUrgent(nightUrgent);
}

function createDemoDeps(): AreaDeps {
  return { service: demoOnboardingService };
}
