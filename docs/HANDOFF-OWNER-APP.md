# Handoff: owner app UI build (for the contributing agent)

You are building `apps/owner` (Expo 58 + Astryx in DOM components) from the
product handoff. Read this once, then `docs/HANDOFF-OWNER-APP.md`'s task queue
is your assignment. `AGENTS.md` is the constitution; `docs/DECISIONS.md` is
the decision log. When in doubt, stop and ask the operator — never guess.

## Product

Zukki: customers talk to an AI on WhatsApp; owners answer from this app.
Demo path (build first): push → request detail → accept → chat with polish →
quote → (customer approves on WhatsApp) → post review.
Sources of truth: `handoff-ui/HANDOFF-UI.md`, `handoff-ui/owner-app/HANDOFF-RN-UI.md`,
`handoff-ui/owner-app/design/html/*.html` (copy/layout truth), `handoff-ui/owner-app/starter/`
(verified working shell, already adopted into `apps/owner`).

## Architecture (decisions D2/D3)

```
app/                       thin routes: one import + one render each
features/requests/         components/ copys/ services/ hooks/ lib/
features/chats/            "
features/jobs/             "
features/content/          "
features/business/         "
shared/mascot/ shared/theme/ shared/data/ shared/shell/
lib/                       legacy (tonight + api-client); leave untouched
```

Rules: dependencies flow `app/` → `features/` → `shared/`; no feature imports
another; nothing new in `shared/` without two real callers. Components never
import services; routes never call services; hooks consume services via
injected dependencies and return domain types (`shared/data/types.ts`).
DOM rules: serializable props, top-level async callbacks, no children.
Copy lives in `copys/` (typed), taken from the handoff design HTML.
Commits: Conventional Commits, no AI attribution. Push/PR are the human's call.

## Test plan (reviewed by the operator after every iteration)

Gates every iteration (not optional):

```sh
cd apps/owner && node --stack-size=16000 ../../node_modules/typescript/lib/tsc.js --noEmit -p tsconfig.json
cd apps/owner && ../../node_modules/.bin/expo export --platform android   # via the repo pnpm binary
npm test            # root suite, must stay green
npm run typecheck   # root, must stay clean
```

Unit tests (new, `node --test` pattern like `packages/shared/test/`):

- T3 requests: `lib/countdown` (seconds→mm:ss, expiry clamp at 0),
  `services/offersService` with a fake client (returns demo numbers),
  copys completeness (every key used by the screen exists).
- T4 chats: polish preview selection (original vs polished), option A/B
  sender/footer mapping.
- T5 jobs: quote totals from lines (range math reuses `packages/shared`
  schemas where they exist — check before writing new math).
- T6 content/business: post draft status transitions; business profile
  round-trip through the mock adapter.

Discipline: write the tests for a slice first and show them failing (RED);
the operator reviews and locks them; implement to GREEN without changing
the reviewed tests (new regression tests are allowed); report a wrong test
instead of editing it.

## Task queue

| # | Task | Edit surface | Tests first? |
|---|---|---|---|
| T2 | Restructure `apps/owner` into features × 5 concerns | `apps/owner/**` (moves only, no behavior change; `lib/` untouched) | Gates only |
| T3 | Requests slice (list + detail on real structure) | `features/requests/**`, `shared/data/**` if needed | Yes (above) |
| T4 | Chats slice (thread + polish A/B) | `features/chats/**` | Yes |
| T5 | Jobs slice (quote + job detail) | `features/jobs/**` | Yes |
| T6 | Content + business slices | `features/content/**`, `features/business/**` | Yes |

One task at a time, in order. After each: gates green + a short report
(command → observed result). The operator (parent session) runs git and
reviews; you never commit.

## T3 assignment (Muse Spark 1.3 contributor): requests slice

**Spec.** `features/requests/` serves the owner request flow (demo path steps
4–5): the hook loads the live offer; the detail screen counts down from
`expiresAt`; Accept/Decline transition the offer; all visible text comes from
`copys/`.

**Edit surface.** `apps/owner/features/requests/**` only. Shared state enters
via props (DOM serializable-props rule). Do not touch `app/`, `shared/`,
`lib/`, or other features; if something looks missing there, report it.

**Write these tests first, show them failing (RED), then stop for review:**

1. `features/requests/lib/countdown.test.ts`
   - `formatCountdown(272)` → `"4:32"` (demo value).
   - `formatCountdown(0)` → `"0:00"`; negative input clamps to `"0:00"`.
   - `secondsLeft("2026-10-28T00:05:00-05:00", "2026-10-28T00:05:28-05:00")` → `272`.
   - `secondsLeft` past `expiresAt` → `0` (never negative).
2. `features/requests/services/offersService.test.ts` (fake client, seeded
   from `shared/data/mock.ts`)
   - `getOffer("req_ana")` returns the offered offer (Ana L., `1.2 km`, `urgent`).
   - `getOffer("nope")` → `null`.
   - `accept("req_ana")` → status `accepted`; `decline("req_ana")` → `declined`.
   - Transitions from a non-`offered` offer (accepted/declined/expired) → `null`.
3. `features/requests/copys/requestsCopys.test.ts`
   - Every key the components reference exists and is non-empty.
   - Demo strings verbatim: `"Accept and chat"`, `"Accept within"`,
     `"If you don't answer, Zukki offers the job to the next business."`

**Then implement (GREEN):**

1. `lib/countdown.ts` — pure functions above.
2. `services/offersService.ts` — fake adapter over `shared/data/mock.ts`,
   returning domain types (`shared/data/types.ts`), injected client param.
3. `hooks/useRequestOffer.ts` — consumes the service (dependency injected,
   fake by default), delegates all countdown math to `lib/`.
4. `copys/requestsCopys.ts` + move the screen's strings into it; the screen
   keeps its current rendered output byte-for-byte.

**Report:** the RED output first (as delivered for review), then after
implementation the four gates (handoff "Test plan") with observed results,
plus a one-line diff summary per file. Do not commit.

## Environment notes (this machine)

- Use `/tmp/pnpm10` for installs (the system pnpm 12 cannot write this
  workspace's lockfile). Never install, format, or generate repo-wide.
- TS 7 + Astryx types need the stack-size flag above; plain `tsc` crashes.
- Do not touch `owl-3d/` or `visual-plan/` (user's uncommitted work).
