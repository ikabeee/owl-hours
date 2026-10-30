// Sign-up: the demo name and phone through the service, plus the code send. The form
// itself lives in the DOM screen; the hook owns loading, the submit and the send.
import { useEffect, useState } from "react";
import { demoOnboardingService } from "../services/onboardingService.ts";
import type { OnboardingService } from "../services/onboardingService.ts";

export type SignUpDeps = { service: OnboardingService };

export type SignUpView = {
  defaultName: string;
  defaultPhone: string;
  saveOwnerName: (name: string) => Promise<void>;
  sendCode: (phone: string) => Promise<{ ok: boolean }>;
  submit: (name: string, phone: string) => Promise<boolean>;
};

export type SignUp =
  | { status: "loading" }
  | { status: "failed"; retry: () => Promise<void> }
  | { status: "ready"; view: SignUpView };

export function useSignUp(deps?: Partial<SignUpDeps>): SignUp {
  const [defaults] = useState(createDemoDeps);
  const service = deps?.service ?? defaults.service;

  const [saved, setSaved] = useState<{ name: string; phone: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setFailed(false);
    Promise.all([service.getOwnerName(), service.getLastPhone()]).then(
      ([name, last]) => {
        if (isCurrent) setSaved({ name, phone: last.phone });
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
      defaultName: saved.name,
      defaultPhone: saved.phone,
      saveOwnerName: (name) => service.saveOwnerName(name),
      sendCode: (phone) => service.sendCode(phone),
      submit: (name, phone) => submitSignUp(service, name, phone),
    },
  };

  async function relaunch(): Promise<void> {
    setAttempt((count) => count + 1);
  }
}

// Persists the owner name, then sends the code; the route navigates only on true.
async function submitSignUp(
  service: OnboardingService,
  name: string,
  phone: string,
): Promise<boolean> {
  await service.saveOwnerName(name);
  return (await service.sendCode(phone)).ok;
}

function createDemoDeps(): SignUpDeps {
  return { service: demoOnboardingService };
}
