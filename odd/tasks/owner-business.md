---
status: done
---

# Business slice: profile, prices, settings (T6b)

Objective: build `OwBusiness`, `OwPrices` and `OwSettings` in `apps/owner/features/business`.
Branch `feat/owner-business` (worktree `owl-hours-worktrees/owner-content-business`), coder: muse
(`muse-spark-1.3-contributor`, effort `xhigh`), test runner `node --test` (the owner `test` script).

## Specs

Copy and layout come from `handoff-ui/owner-app/design/html/{OwBusiness,OwPrices,OwSettings}.dc.html`
(source of truth for text); Astryx is the truth for how each control looks. Demo figures come from
`apps/owner/shared/data/mock.ts` (`business`, `accounts`). Quotes below are from
`handoff-ui/owner-app/HANDOFF-RN-UI.md` §7–8.

- S1 Routes (thin adapters, one import + one render): `(tabs)/business/index.tsx` → `OwBusiness`;
  `business/prices.tsx` → `OwPrices`; `settings.tsx` → `OwSettings`. Flow: ""Test Zukki" →
  `business/test`; each row → its editor; the gear → settings; "Sign out" → intro." `business/test` and
  intro do not exist yet: their actions render but navigate nowhere until those slices land.
- S2 Business (`OwBusiness`): "Logo, name, "What Zukki knows about your business", and a settings
  `IconButton`." / "`List` rows with values: Profile, Prices, Extra fees, Hours ("Mon–Sat 8 AM–8 PM ·
  urgent jobs at night"), Service area (with a map strip), Website ("12 services imported")." /
  "Footnote: "Zukki uses this to answer customers. Other businesses never see your chats.""
  Row values are derived from `business` (prices, fees, hours, area, website), not hard-coded.
- S3 Edit prices (`OwPrices`): "Editable rows (`NumberInput`) + Add a price + Save." Validation as in the
  quote: positive whole numbers. Save returns the updated business through the service; a read after
  Save returns the saved prices (round-trip through the fake adapter).
- S4 Settings (`OwSettings`): "`Switch`es: "Taking requests now", "Urgent requests", "Ring on silent at
  night", "Polish with Zukki by default"." / ""Time to accept: 5 / 30 min" (urgent / other; read-only
  for now)." / ""Linked accounts · 2 connected" → accounts. "Sign out" (destructive text)."
  The time to accept comes from `business.acceptWindowMin`; the connected count from `accounts`.
- S5 Every screen: "Loading: `Skeleton` blocks with no shimmer, or nothing under 300 ms." / "Empty:
  `EmptyState` with the owl." / "Error: owl `failed` + "Something went wrong." + "Try again". Never a raw
  error message."
- S6 Architecture (`AGENTS.md`): components never import services; routes never call services; hooks are
  the only service consumers, with injected dependencies (fake by default); pure logic in `lib/`; every
  visible string in `copys/`. Expo DOM rules: serializable props, top-level async callbacks, no children.

## Tasks

- T6b.1: business slice, S1–S6, route: delegated to muse (user's harness choice), status: done (GREEN, reviewed)

## Log

- L1 (user, 2026-10-29): "Para tener toda la UI cual es la lista de tareas que faltan?" then "Es posible
  coordinar agentes en esta sesion (muse y agy, son los arneses que ocuparemos) para acabar mass rapido?"
  then "Arranca pero antes entrar a la delegacion necesito meter al git ignore el graphify".
  - Split: T6a content → agy, T6b business → muse, in one worktree from `main` (df478a3) with disjoint
    surfaces, because T5 runs in another session in the main checkout.
- L2 (user, 2026-10-29): "Sí, apruebo ambos, mándalos a GREEN".
  - Rule: copy from the handoff HTML, data verbatim from `mock.ts` (no `shared/` edits; T5 edits `mock.ts`).
  - Answers: Hours row "Mon–Sat, 8 AM–8 PM · urgent jobs at night"; Prices row = first three prices with
    full labels ("Unclog a drain from $80"); `BusinessSettings` lives in `services/businessService.ts`
    with the coder's field names; switch seed on, on, on, off (HTML `aria-checked`); feature-local demo
    values in the fake client: `importedServices: 12`, `areaLabel: "Northside"`; copys key names approved.
  - RED: 5 files, 5 failing on import, existing 172 green. Tests adjusted by the operator, then locked.
- L3 (operator, 2026-10-29): GREEN + one cleaner round.
  - GREEN: muse implemented lib, services, hooks, copys, the three DOM screens and routes; locked-test checksums
    unchanged.
  - Review (Opus, independent): 4 blockers (state lost between screens, glue words in lib, placeholder logo and
    map although the assets exist, Settings label/value merged) and 8 advisories; one cleaner round fixed all.
  - Gates (operator re-run): owner `tsc` clean; `npm test` 5/5; `npm run typecheck` 5/5; `expo export --platform
    android --clear` OK.
  - Pending: the owl-only empty state renders an empty `<h3>` (`EmptyState title=""`); the Business screen loads
    twice on first mount (focus reload); `logoNorthside.ts` made byte-identical on `feat/owner-content` (b124694).
  - Next objective: 5. Onboarding (T7, `feat/owner-onboarding`, GREEN running).
