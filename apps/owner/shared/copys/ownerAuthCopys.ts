// Session failure messages. Sign-in screens take their copy from the onboarding
// handoff (features/onboarding/copys); these strings never reach a screen today.
export const authCopys = {
  restoreError: "Could not restore your session. Please sign in again.",
  signOutError: "Could not sign out. Please try again.",
  signInRequired: "Sign in to continue.",
  sessionExpired: "Your session has expired. Sign in again.",
} as const;
