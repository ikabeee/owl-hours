---
status: done
---

# Content slice: drafts, post review, linked accounts (T6a)

Objective: build `OwContent`, `OwPostReview` and `OwAccounts` in `apps/owner/features/content`.
Branch `feat/owner-content` (worktree `owl-hours-worktrees/owner-content`), coder: agy
(`gemini-3.8-flash-high`), test runner `node --test` (the owner `test` script).

## Specs

Copy and layout come from `handoff-ui/owner-app/design/html/{OwContent,OwPostReview,OwAccounts}.dc.html`
(source of truth for text); Astryx is the truth for how each control looks. Demo figures come from
`apps/owner/shared/data/mock.ts` (`drafts`, `accounts`, `anaJob`). Quotes below are from
`handoff-ui/owner-app/HANDOFF-RN-UI.md` §7–8.

- S1 Routes (thin adapters, one import + one render): `(tabs)/content/index.tsx` → `OwContent`;
  `(tabs)/content/accounts.tsx` → `OwAccounts` "(keeps the tab bar)"; `post/[id].tsx` → `OwPostReview`.
  Flow: "a draft → `post/[id]` → "Approve and post" → Content (Published or Scheduled); "Regenerate" asks
  Zukki for a new version; "Manage" → accounts."
- S2 Content (`OwContent`): "Accounts card (Connected + Manage)." / ""Drafts for you · 3" with "Made from
  your jobs and prices" and the owl `review`. Draft rows: a 72 thumbnail, title, source line, and
  "Review"." / ""Published" list." The count (3) is the number of drafts with status `draft`.
- S3 Post review (`OwPostReview`): "Facebook-style preview: business header, caption, before/after image
  labelled "Fixed in 91 minutes", and "Image made from your job photos. Ana agreed to share them."" /
  "Facebook Page and Instagram checkboxes; "When: Today, 6:00 PM"." / ""Edit" makes the caption editable.
  Footer: Regenerate + "Approve and post"." / "Job photos appear only with `shareConsent="yes"`."
- S4 Approve: "Approve and post" moves a `draft` to `scheduled` when it has a future `scheduledFor`,
  otherwise to `published` with `publishedAt`; it keeps the chosen targets and the (edited) caption.
  Only a `draft` can be approved or regenerated (anything else returns `null`). Assumption: with no
  target checked, "Approve and post" is disabled.
- S5 Linked accounts (`OwAccounts`): "Facebook Page: Connected. Instagram: "@northsideplumbing ·
  professional account", Connected. (No ad account: paid ads are out of scope.)" / ""What Zukki can do":
  two checks and one cross." / ""See today's drafts"."
- S6 Every screen: "Loading: `Skeleton` blocks with no shimmer, or nothing under 300 ms." / "Empty:
  `EmptyState` with the owl." / "Error: owl `failed` + "Something went wrong." + "Try again". Never a raw
  error message."
- S7 Architecture (`AGENTS.md`): components never import services; routes never call services; hooks are
  the only service consumers, with injected dependencies (fake by default); pure logic in `lib/`; every
  visible string in `copys/`. Expo DOM rules: serializable props, top-level async callbacks, no children.

## Tasks

- T6a.1: content slice, S1–S7, route: delegated to agy (user's harness choice), status: done (GREEN, reviewed)

## Log

- L1 (user, 2026-10-29): "Para tener toda la UI cual es la lista de tareas que faltan?" then "Es posible
  coordinar agentes en esta sesion (muse y agy, son los arneses que ocuparemos) para acabar mass rapido?"
  then "Arranca pero antes entrar a la delegacion necesito meter al git ignore el graphify".
  - Split: T6a content → agy, T6b business → muse, in one worktree from `main` (df478a3) with disjoint
    surfaces, because T5 runs in another session in the main checkout.
- L2 (user, 2026-10-29): "Sí, apruebo ambos, mándalos a GREEN".
  - Rule: copy from the handoff HTML, data verbatim from `mock.ts` (no `shared/` edits).
  - Answers: Instagram shows the mock name "@northsideplumbing (professional)"; "When" is a copys label
    and `postWhenText` returns the value only ("Today, 6:00 PM"), so S3's "When: Today, 6:00 PM" renders as
    two spans as in the HTML; the fake client seeds one published post "Water heater installed in one
    visit" (Oct 20); copys gain "Draft {index} of {total} · {source}" with the job source line
    "made from last night's job".
  - Review fixes by the operator: isolation tests snapshot the mock before acting; `approve(id, { caption,
    targets })` is tested through the service.
  - RED: 6 files failing on import, existing 172 green. Tests locked.
- L3 (operator, 2026-10-29): GREEN + one cleaner round.
  - GREEN: agy implemented lib, services, hooks, copys, the three DOM screens and routes; locked-test checksums
    unchanged; the operator renamed the Content tab route to `content` in `shared/shell/TabBar.tsx` because the
    nested Stack changes the route name.
  - Review (Opus, independent): 7 blockers, 11 advisories; one cleaner round fixed all 6 coder blockers (shared
    fake client + reload on focus, consent-driven thumbnail, no hard-coded strings, error screen for an unknown
    draft, one `sourceLine`, Instagram name verbatim) and the advisories.
  - Gates (operator re-run): owner `tsc` clean; `npm test` 5/5; `npm run typecheck` 5/5; `expo export --platform
    android --clear` OK.
  - Pending: no empty state for Published (no copy in the design); "Regenerate" is a no-op in the fake;
    `assets/img/logoNorthside.ts` is also generated on `feat/owner-business` (keep one at merge).
  - Next objective: 3. Business (T6b, `feat/owner-business`).
