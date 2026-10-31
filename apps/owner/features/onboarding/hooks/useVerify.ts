// Verify: which number the code went to, the live resend state, and the code check.
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
  phone: string;
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

  const [phone, setPhone] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setFailed(false);
    service.getLastPhone().then(
      (last) => {
        if (!isCurrent) return;
        setPhone(last.phone);
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
  if (phone === null || resendAt === null) return { status: "loading" };

  return {
    status: "ready",
    view: {
      phone,
      resend: resendState(resendSecondsLeft(resendAt, new Date(now).toISOString())),
      verify: (code) => checkCode(service, phone, code),
      resendCode: () => resendCode(service, phone, setResendAt),
    },
  };

  async function relaunch(): Promise<void> {
    setAttempt((count) => count + 1);
  }
}

async function checkCode(
  service: OnboardingService,
  phone: string,
  code: string,
): Promise<VerifyOutcome> {
  const result = await service.verifyCode(phone, code);
  return result.ok ? { kind: "verified" } : { kind: "wrong_code" };
}

async function resendCode(
  service: OnboardingService,
  phone: string,
  setResendAt: (resendAt: string) => void,
): Promise<void> {
  await service.sendCode(phone);
  setResendAt(resendAtFrom((await service.getLastPhone()).sentAt));
}
