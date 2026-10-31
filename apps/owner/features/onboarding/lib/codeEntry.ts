// Verify-code entry: digit accumulation with auto-submit on the 6th digit, and the resend
// countdown ("Resend code in 0:24", becoming the "Resend code" link at 0). `now` is injected:
// no real Date.now(). Composed text comes from copys (prefix + clock).
import { onboardingCopys } from "../copys/onboardingCopys.ts";

export const CODE_LENGTH = 6;
export const RESEND_DELAY_S = 30;

export type CodeEntry = { code: string; submitted: boolean };

export function enterDigit(code: string, digit: string): CodeEntry {
  if (!isSingleDigit(digit) || code.length >= CODE_LENGTH) return { code, submitted: false };

  const next = code + digit;
  return { code: next, submitted: next.length === CODE_LENGTH };
}

export function resendSecondsLeft(resendAt: string, now: string): number {
  const msLeft = Date.parse(resendAt) - Date.parse(now);
  return Math.max(0, Math.floor(msLeft / 1000));
}

export function resendAtFrom(sentAt: string): string {
  return new Date(Date.parse(sentAt) + RESEND_DELAY_S * 1000).toISOString();
}

export type ResendState = { kind: "countdown"; text: string } | { kind: "link" };

export function resendState(secondsLeft: number): ResendState {
  if (secondsLeft <= 0) return { kind: "link" };

  return { kind: "countdown", text: `${onboardingCopys.resendPrefix} ${clockText(secondsLeft)}` };
}

function isSingleDigit(digit: string): boolean {
  return /^\d$/.test(digit);
}

function clockText(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
