// Auth gate (HANDOFF-RN-UI section 7): in live mode a signed-out owner starts at sign-up.
// Onboarding stays open so the owner can sign up and verify; demo mode never gates.
export type OwnerAuthGateInput = {
  configured: boolean;
  loading: boolean;
  signedIn: boolean;
  pathname: string;
};

export const SIGN_UP_ROUTE = '/onboarding/sign-up';
const ONBOARDING_PREFIX = '/onboarding/';

export function ownerAuthRedirect(input: OwnerAuthGateInput): string | null {
  if (!mustSignIn(input)) return null;
  if (input.pathname.startsWith(ONBOARDING_PREFIX)) return null;

  return SIGN_UP_ROUTE;
}

function mustSignIn({ configured, loading, signedIn }: OwnerAuthGateInput): boolean {
  return configured && !loading && !signedIn;
}
