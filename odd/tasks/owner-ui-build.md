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
- T3: requests slice: countdown lib + offers service + hook + copys, S2-S3,
  route: delegated (Claude Sonnet 5.5, effort high, user's choice), branch
  `feat/owner-requests-slice`, status: done (GREEN)
- T4: chats slice (polish), S2-S3, route: delegated (Claude Sonnet 5.5,
  effort high, user's choice), branch `feat/owner-chats-slice`, status:
  done (GREEN)
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
- L7 (user, 2026-10-28): "Usaremos claude sonnet 5.5 en high siguien el
  mismo flujo de ODD". Before launch the operator fixed two defects in the
  T3 assignment: the `secondsLeft` example used `expiresAt` 00:05:00 (past
  `now`, so 0, not 272); corrected to `req_ana.expiresAt` 00:10:00. The
  owner `test` script ran only `lib/tonight.test.ts`; the coder widens it to
  include `features/**/*.test.ts` (added to the edit surface). Open for T3:
  whether an `offered` offer past `expiresAt` can be accepted (not specified).
- L8 (user, 2026-10-28): "Sí, apruebo los tests, bloquéalos y pasa al
  GREEN". Approval covers the operator's answers to the RED open questions:
  (1) no clock in the service; the hook disables Accept at 0:00 and the
  backend owns the final rule; (2) design strings the screen does not render
  today stay out of T3; (3) the `RequestsScreen` list placeholder stays out
  of T3. Tests locked via `.claude/tests.lock`. GREEN edit surface adds
  `app/request/[id].tsx` (the route must wire the hook; it holds a hardcoded
  offer today). Operator finding for GREEN: `RequestScreen.tsx:45` hardcodes
  `max={300}`; derive it from `acceptWindowMin` (urgent 5 / other 30 min).
- L9 (2026-10-28): T3 GREEN by the Sonnet 5.5 coder; locked tests unchanged.
  Operator review fix: hook `accept`/`decline` now return a boolean and the
  route navigates only after a successful transition (previously it
  navigated to the chat even when the offer was no longer `offered`).
  Gates: owner `npm test` 30/30, owner tsc clean, `expo export` OK
  (binary at `apps/owner/node_modules/.bin/expo`), root `npm test` 3/3,
  root typecheck 5/5. Lock removed. Not checked: the first "4:32" frame on a
  real render (no device/browser run). Next: T4 chats slice.
- L10 (user, 2026-10-28): "Delégalo a Sonnet 5.5 en high, mismo flujo".
  T4 assignment written into `docs/HANDOFF-OWNER-APP.md`. Operator findings:
  `app/chat/[id].tsx` is missing although `app/request/[id].tsx:25`
  navigates there (added to the GREEN surface). Correction: the operator
  claimed `mock.ts` had no `c_ana` thread; it exports `anaMessages` (m1, m2)
  at `shared/data/mock.ts:71` (coder found it).
- L11 (2026-10-28): T4 RED by the Sonnet 5.5 coder: 43 new tests fail
  (8 lib, 15 service, 20 copys), existing 30 pass, owner tsc clean. Lib and
  service tests fail on stub throws, copys on assertions. 9 open questions
  pending user review.
- L12 (user, 2026-10-28): "Sí, apruébalos con esas respuestas, bloquéalos y
  pasa a GREEN". Tests adjusted (B label = HANDOFF §8 string, seed =
  `anaMessages`), RED 71/30/41, locked. GREEN by the coder (one run lost to
  a network error, resumed): owner `npm test` 73/73 (operator re-ran),
  owner tsc clean, `expo export` OK, root test + typecheck green. Operator
  finding (open): `app/request/[id].tsx:25` navigates to `c_${offerId}` =
  `c_req_ana`, but the conversation id is `c_ana`, so Accept opens a blank
  chat. "You accepted at" uses device-local `toLocaleTimeString`.
- L13 (user, 2026-10-29): chose "Accept returns conv". Operator, inline and
  test-first: new `offersService.chat.test.ts` (4 tests) RED with
  `findChat is not a function`, then GREEN. Added `findChat` +
  `findConversationId`; the hook `accept` returns the chat id; the route
  navigates with it. Gates: owner `npm test` 77/77, owner tsc clean,
  `expo export` OK, root `npm test` 3/3 tasks, root typecheck 5/5. D7 and D8
  in `docs/DECISIONS.md`. Lock removed. Not checked: chat screen on a real
  render (no device/browser run). Pending (handoff retirement rule):
  `OwChat`/`OwChatPolish` design pairs stay until the screen is verified
  visually (same as `OwRequest` after T3). Next: T5 jobs slice (quote).
