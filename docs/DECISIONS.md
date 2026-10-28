# Decisions

Append-only log of technical decisions for the owner app. One entry per
decision: date, choice, why, consequences. Never edit a past entry; supersede
it with a new one.

## D1 — Supersedes nothing (2026-10-28)

- **Decision:** `apps/owner` keeps Expo DOM components (Astryx inside
  `'use dom'`) as the handoff prescribes; native shell owns navigation,
  tab bar, push, haptics, safe areas.
- **Why:** `@astryxdesign/core` is a web library; the handoff verified the
  DOM path on Expo SDK 58 (startup ≈3.1 MB bundle + 194 KB Astryx CSS,
  measured in this repo).
- **Consequences:** DOM rules are law (serializable props, top-level async
  callbacks, no children); chat keyboard needs a physical-device check.

## D2 — Screaming features (2026-10-28)

- **Decision:** feature modules (`requests`, `chats`, `jobs`, `content`,
  `business`), each managed by `components/`, `copys/`, `services/`,
  `hooks/`, `lib/`. `app/` holds thin route adapters. No new `shared/` entry
  without two real callers.
- **Why:** the tree must name the business, not the framework; deep modules
  keep interfaces small (one screen entry per feature).
- **Consequences:** a feature never imports another feature; shared state
  crosses via route props (matches the DOM serializable-props rule).

## D3 — Services seam (2026-10-28)

- **Decision:** `services/` is the only API layer; hooks are the only
  consumers; services return domain types, never raw rows. Client singleton
  under `shared/infra/` (mock today, Supabase tomorrow).
- **Why:** two real adapters exist (mock + Supabase), so the seam earns its
  place; components stay presentational and testable.
- **Consequences:** switching adapters touches no component; every service
  gets a fake-adapter test before the hook that consumes it.

## D4 — Delegation, no Claude plan (2026-10-28)

- **Decision:** coders are this session's subagents by default (tests first:
  coder shows RED, operator locks the reviewed tests, coder implements to
  GREEN, operator reviews each iteration). The operator (this session) runs
  git; committers never touch reviewed tests to make them pass.
- **Why:** the user declared no Claude subscription plan, so hybrid routing
  by subscription does not apply.
- **Consequences:** edit surfaces are declared per task in
  `docs/HANDOFF-OWNER-APP.md`; the user reviews tests after each iteration.

## D5 — Coder roster (2026-10-28, supersedes D4's default)

- **Decision:** coders are, for now, the **Muse Spark 1.3 contributor** (behavior slices with tests, T3 onward) and **agy (Antigravity, Gemini 3.8 Flash)** (mechanical sweeps and audits, T2). This session orchestrates, reviews every iteration, and runs git.
- **Why:** user directive (2026-10-28); no Claude subscription plan applies (D4).
- **Consequences:** each harness works only inside its declared edit surface in `docs/HANDOFF-OWNER-APP.md`; the operator re-runs the gates before accepting a diff.
