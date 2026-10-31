// Onboarding route order and step header. Flow (HANDOFF-RN-UI section 7):
// intro -> sign-up -> verify -> business -> prices -> area -> live -> requests.
// "Continue with Facebook" skips verify; "I already have an account" goes to requests.
// Routes live under app/onboarding/ (operator, L2): an (onboarding) group would resolve
// /business onto the Business tab, since Expo Router groups do not change the URL.
import { onboardingCopys } from "../copys/onboardingCopys.ts";

export const TOTAL_SETUP_STEPS = 3;

export const ONBOARDING_ORDER = [
  "/onboarding/intro",
  "/onboarding/sign-up",
  "/onboarding/verify",
  "/onboarding/business",
  "/onboarding/prices",
  "/onboarding/area",
  "/onboarding/live",
  "/requests",
];

export type StepMove = "next" | "facebook" | "has-account";

export function resolveNext(current: string, move: StepMove): string {
  if (move === "has-account") return "/requests";
  if (move === "facebook") return "/onboarding/business";

  return stepAfter(current);
}

export function stepLabel(step: number): string {
  return `${onboardingCopys.stepWord} ${step} ${onboardingCopys.stepOf} ${TOTAL_SETUP_STEPS}`;
}

function stepAfter(current: string): string {
  const next = ONBOARDING_ORDER[ONBOARDING_ORDER.indexOf(current) + 1];
  return next ?? current;
}
