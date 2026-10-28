---
status: done
---

# Owner app shell: tabs + Request screen (handoff day 1)

Adopt the verified starter into `apps/owner` so the tab shell and the
`request/[id]` screen run on a phone. Old-model `(tonight)` screens go;
`lib/` logic and its tests stay green.

## Specs

- S1: `apps/owner` runs the starter `RequestScreen` (Astryx in a DOM
  component) at `request/[id]`, wired to mock data behind serializable props
  and async callbacks (handoff §3).
- S2: native tab shell with 5 tabs (Requests, Chats, Jobs, Content, Business)
  per handoff §7–§8; tab screens are placeholders until their slices land.
- S3: verification gates from the handoff (§2, §11): strict typecheck passes
  (with the `node --stack-size=16000` workaround) and `expo export` bundles
  for Android.
- S4: existing `npm test` suite stays green (`apps/owner/lib/tonight.test.ts`
  untouched).
- S5: no new UI kit, no `stylex.create` in app code, DOM rules hold (no
  children, top-level async callbacks only).

## Tasks

- T1: tracking doc (this file), S1-S5, route: inline, commit: n/a
- T2: deps (Astryx, DOM toolchain, haptics, tab icons/fonts), S1-S3, route: inline
- T3: adopt starter (`app/_layout`, `request/[id]`, `components/`, `data/`,
  tokens), remove replaced old-model screens, S1+S5, route: inline
- T4: tab shell + native TabBar + placeholder tabs, S2, route: inline
- T5: RED→GREEN (typecheck + export + `npm test`), S3+S4, route: inline

## Seams (tdd)

No new unit-test seam exists in this slice (presentational shell; data hooks
come later). Agreed gates: existing `npm test` suite (regression), strict
typecheck on the app, `expo export` for Android — the handoff's own
verification. RED = new DOM imports unresolvable before T2; GREEN = all gates
pass after T4.

## Log

- L1 (user, verbatim): `"/Users/carlglzm/Downloads/zukki-ui-handoff" "/Users/carlglzm/Downloads/HANDOFF-UI.md" Este es el handoff`
- L2 (user decisions): scope `Integrar handoff al repo`; binaries full copy;
  start `Shell Owner + Request (Recommended)`.
- L3 (agent): branch `feature/owner-shell` off `chore/zukki-ui-handoff`;
  `lib/tonight.ts` + test stay (root `npm test` covers them); old route files
  go because they encode the superseded model.
- L4 (close): GREEN — owner `tsc` clean, `expo export --platform android` OK
  (entry 4.9 MB + DOM bundle 3.1 MB JS / 194 KB Astryx CSS, matching the
  handoff probe), root `npm test` 15/15, root typecheck clean. Uncommitted on
  `feature/owner-shell`. Next: OwRequests tab screen, then chat + quote (demo
  path); push/deep-link handler still pending.
- L5 (screaming architecture, user): `components/` + `data/` dissolved into
  `features/{requests,chats,jobs,content,business}` and
  `shared/{mascot,theme,data,shell}`; `app/` keeps thin route adapters only.
  Rule in `features/README.md`: `app/` → `features/` → `shared/`, no
  hypothetical seams (mock still travels via props). Same proof re-run after
  the move: owner `tsc` clean, export OK, `npm test` 15/15, root typecheck
  clean. Still uncommitted on `feature/owner-shell`.
