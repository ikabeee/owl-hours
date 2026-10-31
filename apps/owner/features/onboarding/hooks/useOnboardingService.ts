// Which onboarding service the screens use: the live one when the owner auth runtime is
// configured (its SMS send/verify injected), the demo fake otherwise.
import { useOwnerAuth } from "../../auth/hooks/useOwnerAuth.tsx";
import { onboardingServiceFor } from "../services/onboardingService.ts";
import type { OnboardingService } from "../services/onboardingService.ts";

export function useOnboardingService(): OnboardingService {
  return onboardingServiceFor(useOwnerAuth().phoneAuth);
}
