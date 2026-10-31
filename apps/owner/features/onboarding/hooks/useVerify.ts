// Verify: which address the code went to, the live resend state, and the code check.
// The service returns the "wrong_code" state; the screen owns the copy. The 1 s ticker
// lives here (never in the DOM screen): resend derives from resendAt and now.
import { useEffect, useState } from "react";
import { resendAtFrom, resendSecondsLeft, resendState } from "../lib/codeEntry.ts";
import type { ResendState } from "../lib/codeEntry.ts";
import type { OnboardingService } from "../services/onboardingService.ts";
import { useOnboardingService } from "./useOnboardingService.ts";

export type VerifyDeps = { service: OnboardingService };

export type VerifyOutcome = { kind: "verified" } | { kind: "wrong_code" };

export type VerifyView = {
  email: string;
  resend: ResendState;
  verify: (code: string) => Promise<VerifyOutcome>;
  resendCode: () => Promise<void>;
};

export type Verify =
  | { status: "loading" }
  | { status: "failed"; retry: () => Promise<void> }
  | { status: "ready"; view: VerifyView };

export function useVerify(deps?: Partial<VerifyDeps>): Verify {
  const configured = useOnboardingService();
  const service = deps?.service ?? configured;

  const [email, setEmail] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setFailed(false);
    service.getLastEmail().then(
      (last) => {
        if (!isCurrent) return;
        setEmail(last.email);
        setResendAt(resendAtFrom(last.sentAt));
      },
      () => {
        if (isCurrent) setFailed(true);
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [service, attempt]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (failed) return { status: "failed", retry: relaunch };
  if (email === null || resendAt === null) return { status: "loading" };

  return {
    status: "ready",
    view: {
      email,
      resend: resendState(resendSecondsLeft(resendAt, new Date(now).toISOString())),
      verify: (code) => checkCode(service, email, code),
      resendCode: () => resendCode(service, email, setResendAt),
    },
  };

  async function relaunch(): Promise<void> {
    setAttempt((count) => count + 1);
  }
}

async function checkCode(
  service: OnboardingService,
  email: string,
  code: string,
): Promise<VerifyOutcome> {
  const result = await service.verifyCode(email, code);
  return result.ok ? { kind: "verified" } : { kind: "wrong_code" };
}

async function resendCode(
  service: OnboardingService,
  email: string,
  setResendAt: (resendAt: string) => void,
): Promise<void> {
  await service.sendCode(email);
  setResendAt(resendAtFrom((await service.getLastEmail()).sentAt));
}
