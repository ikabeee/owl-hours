---
status: in-progress
---

# Build the owner UI from the handoff (delegated, test-first)

Restructure `apps/owner` to the screaming architecture (features managed by
components, copys, services, hooks, lib) and build the demo path slice by
slice, delegated with test-first discipline.

## Specs

- S1: app architecture is screaming: `features/` per business flow, each with
  `components/`, `copys/`, `services/`, `hooks/`, `lib/`; `app/` stays thin.
- S2: services are consumed only through hooks; components never import services.
- S3: tests are planned per iteration and reviewed by the user after each one.
- S4: every technical decision is documented (`docs/DECISIONS.md`).

## Tasks

- T1: this doc + handoff + DECISIONS seed, S1-S4, route: inline
- T2: restructure to features×5-concerns (behavior-preserving), S1-S2
- T3: requests slice: countdown lib + offers service + hook + copys, S2-S3
- T4: chats slice (polish), S2-S3
- T5: jobs slice (quote), S2-S3
- T6: content + business slices, S2-S3

## Log

- L1 (user): plan approved with services added; start delegating; plan tests
  for review per iteration; document every technical decision.
- L2 (user): no Claude subscription plan; coders = this session's subagents
  unless redirected.
- L3 (user): roster = Muse Spark 1.3 contributor + agy (Gemini 3.8 Flash).
  Decisions D1-D5 in `docs/DECISIONS.md`.
- L4: T2 done by agy (moves to `features/*/components/`, imports + tsconfig
  fixed); operator verified: owner tsc clean, export OK, npm test 15/15,
  root typecheck clean. Uncommitted. Next: T3 (requests slice) — Spark 1.3
  contributor takes it from `docs/HANDOFF-OWNER-APP.md`; tests reviewed by
  the user before implementation starts.
- L5: T3 assignment written into `docs/HANDOFF-OWNER-APP.md` (edit surface,
  3 named test files with demo literals, RED→stop-for-review). No Spark 1.3
  entry point exists in this session (no peer session, no CLI), so the
  contributor must be launched by the user; agy remains launchable here.
- L6 (close this PR): shell + T2 foundation ships as one PR for review. T3–T6
  stay queued in `docs/HANDOFF-OWNER-APP.md`; they are not part of this PR.
  UI verified live at `http://localhost:8097/request/req_ana` (HTTP 200).
  Status stays `in-progress` until T3–T6 land.
