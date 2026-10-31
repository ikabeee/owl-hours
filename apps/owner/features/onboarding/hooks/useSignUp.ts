// Sign-up: the saved name and email through the service, plus the code send. The form
// itself lives in the DOM screen; the hook owns loading, the submit and the send.
import { useEffect, useState } from "react";
import type { OnboardingService } from "../services/onboardingService.ts";
import { useOnboardingService } from "./useOnboardingService.ts";

export type SignUpDeps = { service: OnboardingService };

export type SignUpView = {
  defaultName: string;
  defaultEmail: string;
  saveOwnerName: (name: string) => Promise<void>;
  sendCode: (email: string) => Promise<{ ok: boolean }>;
  submit: (name: string, email: string) => Promise<boolean>;
};

export type SignUp =
  | { status: "loading" }
  | { status: "failed"; retry: () => Promise<void> }
  | { status: "ready"; view: SignUpView };

export function useSignUp(deps?: Partial<SignUpDeps>): SignUp {
  const configured = useOnboardingService();
  const service = deps?.service ?? configured;

  const [saved, setSaved] = useState<{ name: string; email: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setFailed(false);
    Promise.all([service.getOwnerName(), service.getLastEmail()]).then(
      ([name, last]) => {
        if (isCurrent) setSaved({ name, email: last.email });
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
      defaultEmail: saved.email,
      saveOwnerName: (name) => service.saveOwnerName(name),
      sendCode: (email) => service.sendCode(email),
      submit: (name, email) => submitSignUp(service, name, email),
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
  email: string,
): Promise<boolean> {
  await service.saveOwnerName(name);
  return (await service.sendCode(email)).ok;
}
