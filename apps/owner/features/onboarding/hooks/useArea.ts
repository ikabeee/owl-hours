// Setup step 3 (hours and area): the saved radius and night switch, plus the finish
// that persists both and moves the flow to live. In live mode the step also saves
// the device location (located by the native route) as the business location.
import { useEffect, useState } from "react";
import { settleLocation } from "../lib/areaLocation.ts";
import type { DeviceFix, LocationState, LocationStatus } from "../lib/areaLocation.ts";
import { clampRadiusKm } from "../lib/areaRadius.ts";
import type { OnboardingService } from "../services/onboardingService.ts";
import { useOnboardingService } from "./useOnboardingService.ts";

export type AreaDeps = { service: OnboardingService };

export type LocateDevice = () => Promise<DeviceFix>;

export type AreaView = {
  radiusKm: number;
  nightUrgent: boolean;
  hoursSummary: string;
  location: LocationState;
  finish: (radiusKm: number, nightUrgent: boolean) => Promise<void>;
  saveDeviceLocation: (radiusKm: number) => Promise<void>;
};

export type Area =
  | { status: "loading" }
  | { status: "failed"; retry: () => Promise<void> }
  | { status: "ready"; view: AreaView };

export function useArea(locate: LocateDevice, deps?: Partial<AreaDeps>): Area {
  const configured = useOnboardingService();
  const service = deps?.service ?? configured;

  const [saved, setSaved] = useState<{
    radiusKm: number;
    nightUrgent: boolean;
    hoursSummary: string;
  } | null>(null);
  const [location, setLocation] = useState<LocationState | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setFailed(false);
    Promise.all([
      service.getArea(),
      service.getNightUrgent(),
      service.getHoursSummary(),
      service.getLocationStatus(),
    ]).then(
      ([area, nightUrgent, hoursSummary, locationStatus]) => {
        if (!isCurrent) return;
        setSaved({ radiusKm: area.radiusKm, nightUrgent, hoursSummary });
        setLocation({ status: locationStatus, notice: null });
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
  if (saved === null || location === null) return { status: "loading" };

  return {
    status: "ready",
    view: {
      radiusKm: saved.radiusKm,
      nightUrgent: saved.nightUrgent,
      hoursSummary: saved.hoursSummary,
      location,
      finish: (radiusKm, nightUrgent) => finishArea(service, radiusKm, nightUrgent),
      saveDeviceLocation: (radiusKm) => saveDeviceLocation(location.status, radiusKm),
    },
  };

  async function saveDeviceLocation(current: LocationStatus, radiusKm: number): Promise<void> {
    const fix = await locate();
    setLocation(await settleLocation(current, fix, (point) => service.saveLocation(point, clampRadiusKm(radiusKm))));
  }

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
