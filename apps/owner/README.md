# Owner app (Expo)

Screens 04, 05, 07, 10 + onboarding. Expo gives push notifications,
background location, and the microphone; Expo web gives judges a
no-install link.

## Layout

- `app/(tonight)/inbox.tsx` — screen 04, tonight's jobs in three tabs (example feature, wired to `GET /jobs`)
- `app/(tonight)/map.tsx` — screen 07 (next slice: MapLibre / react-native-maps)
- `app/(tonight)/promote.tsx` — screen 10 (next slice: ad studio)
- `app/quote/[id].tsx` — screen 05 (next slice: owner confirm)
- `lib/tonight.ts` — pure inbox grouping, tested with `node --test`
- `lib/api-client.ts` — HTTP client, base URL from `EXPO_PUBLIC_API_URL`

Theme: Astryx neutral, Figtree, accent `#0074e2` (tokens in `design/tokens.json`).

## Owner sign-in

The owner signs in on the onboarding sign-up and verify screens with an emailed 6-digit code.
Set the public Supabase variables in `.env.example` (without them the app runs the
demo); follow [owner authentication](../../docs/OWNER-AUTH.md) for the Email
provider setup, persistence, API origins, and the live acceptance checklist.
