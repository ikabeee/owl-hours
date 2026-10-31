# Owner authentication

This is app-wide infrastructure, independent of Story Pack. The owner signs in
with the handoff onboarding flow `OwSignUp` → `OwVerify`: a mobile number and a
6-digit code sent by SMS. There is no email or magic-link screen.

The shared Supabase singleton lives in `apps/owner/shared/infra/`. The auth
feature owns the root provider (`OwnerAuthProvider`), the auth gate and the
foreground refresh adapter. The provider hands the SMS send/verify to onboarding
(`useOnboardingService`), and feature services reuse the singleton's `restore`,
`subscribe`, `signOut` and `getAccessToken` methods.

## Sign-in flow

- **Send:** `sendCode(phone)` calls `supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: true } })`.
  Spaces and dashes are removed first, so `+1 555 014 2290` is sent as `+15550142290` (E.164).
  Sign-up creates the owner's auth user on the first code.
- **Verify:** `verifyCode(phone, code)` calls `supabase.auth.verifyOtp({ phone, token: code, type: 'sms' })`.
  The SDK stores the returned session through the owner storage below and emits it;
  the auth controller keeps it.
- **Gate:** in live mode, a signed-out owner on any route outside `/onboarding/*` is
  sent to `/onboarding/sign-up` once the stored session has been restored.
- **Demo mode:** without `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  there is no auth runtime: onboarding keeps the in-memory fake (`DEMO_CODE`), the
  demo owner is prefilled on sign-up, and nothing is gated.

## Configuration and deployment acceptance

Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the owner
build environment. The public anon/publishable key is not a service-role key.

Before live acceptance, the operator must enable the Supabase **Phone** provider
(Authentication → Providers → Phone) and configure an SMS provider (Twilio,
MessageBird, Textlocal or Vonage) with its credentials, plus the OTP expiry and
SMS rate limits. These hosted settings have **not** been changed by this PR.
No redirect allow-list is needed: SMS sign-in never returns through a URL.

Foreground AppState (native) or page visibility (web) starts token refresh;
background and unmount stop it.

## Session persistence

Native persistence uses SecureStore for every part of the session. Unicode-aware
chunks stay at or below 1,800 UTF-8 bytes, including large JWT/user objects; no
plaintext fallback is used. A small manifest is committed after all parts are
written. A rejected replacement retains the prior complete session and reports
an error. Sign-out removes the manifest before deleting chunks so a cleanup
failure cannot revive a session; failures are surfaced. Incomplete manifests
fail closed. OS storage errors still require owner attention. Browser persistence
uses origin-local storage through the SDK adapter.

## API browser origins

`OWNER_APP_ORIGINS` is a comma-separated list of exact HTTPS browser origins;
localhost HTTP is permitted for development. Set `OWNER_PUBLIC_ORIGIN` to the
single external HTTPS API origin when TLS terminates at a proxy. This explicit
trusted value fixes public same-origin requests whose internal URL is HTTP.
Arbitrary `Forwarded` / `X-Forwarded-*` headers are deliberately ignored.
Owner CORS only covers `/v1/owner/*`, allows GET/POST/PATCH and Authorization /
Content-Type, and does not bypass bearer authentication. Native requests without
an Origin header retain their existing authentication behavior.

## Verification boundary

Automated coverage includes the exact `signInWithOtp` and `verifyOtp` payloads,
SDK `/otp` and `/verify` requests with the verified session written to the given
storage, the controller keeping the emitted session, the live/demo onboarding
service selection, the gate decision, foreground refresh cleanup, persisted SDK
session restore/sign-out, Unicode chunking, storage write and sign-out cleanup
failures, and proxy-origin CORS spoofing. These are synthetic tests; no SMS is sent.

Live acceptance remains: enable the Phone provider; sign up from the installed
Android build with a real number; enter the code; relaunch and verify the same
session; background/foreground and refresh; sign out/relaunch and verify the gate
returns to sign-up.

## Follow-ups

- A failed SMS send is silent: "Send code" stays on sign-up with no message,
  because the handoff has no copy for it.
- Every verify failure (wrong or expired code, network error) shows the handoff
  "That code didn't work. Try again."
- In live mode the onboarding drafts (name, profile, prices, area) stay in memory;
  they are not saved to Supabase yet.

References: [Supabase phone login](https://supabase.com/docs/guides/auth/phone-login),
[Supabase React Native sessions](https://supabase.com/docs/guides/auth/quickstarts/react-native),
[Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).
