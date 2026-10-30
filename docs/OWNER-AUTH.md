# Owner authentication

This is app-wide infrastructure, independent of Story Pack. The shared Supabase
singleton lives in `apps/owner/shared/infra/`; the auth feature owns the UI,
root lifecycle adapter, and `/auth` and `/auth/callback` routes. The root provider
is the only callback/AppState listener. Feature services reuse the singleton's
`restore`, `subscribe`, `signIn`, `signOut`, and `getAccessToken` methods.

## Configuration and deployment acceptance

Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the owner
build environment. The public anon/publishable key is not a service-role key.
The owner must already exist; magic-link requests set `shouldCreateUser: false`.
The callback does not accept fragment access tokens or unverified token claims.
It exchanges a PKCE code with Supabase, including `sb_flow_id` when supplied.
The verifier is stored on the device/browser that initiated the request: open
the link there. The app does not pass session tokens through the DOM bridge.

Before live acceptance, the operator must configure the Supabase Auth redirect
allow-list with `zukki-owner://auth/callback` and each deployed web origin's
`/auth/callback` URL. Keep the existing `zukki-owner` scheme in the native build.
Use a development or release app build, not an Expo Go scheme. These hosted
settings have **not** been changed by this PR.

Native launches read `Linking.getInitialURL()`, running apps receive URL events,
and both validate the exact callback scheme/host/path before exchanging a code.
Foreground AppState starts refresh; background and unmount stop it. Refresh is
configured independently of URL detection. Web also exchanges explicitly and
removes the callback query from browser history after success.

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

Automated coverage includes exact callback validation, replay suppression,
PKCE flow ID forwarding, cold/warm URL delivery, lifecycle cleanup, refresh
failure, persisted SDK session restore/sign-out, Unicode chunking, storage
write failure and sign-out cleanup failure, and proxy-origin CORS spoofing.
These are synthetic tests. Android bundle export is compile evidence, not
installed-device or live-provider acceptance.

Live acceptance remains: configure redirect allow-list; request an existing
owner link from the installed Android build; open once with the app closed and
once while running; relaunch and verify the same session; background/foreground
and refresh; sign out/relaunch and verify no session. Check web `/auth` callback
on the deployed web origin. No email, hosted configuration, or deployment is
performed by these tests.

References: [Supabase mobile deep links](https://supabase.com/docs/guides/auth/native-mobile-deep-linking),
[Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow),
[Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).
