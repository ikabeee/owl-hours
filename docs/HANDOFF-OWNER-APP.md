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
| T5 | Jobs slice (quote + job detail + chat SuggestionRow) | see T5 assignment | Yes |
| T5.1 | Jobs list + finish | `features/jobs/**` | Yes |
| T6 | Content + business slices | `features/content/**`, `features/business/**` | Yes |

One task at a time, in order. After each: gates green + a short report
(command → observed result). The operator (parent session) runs git and
reviews; you never commit.

## T3 assignment (Claude Sonnet 5.5 subagent, effort high): requests slice

**Spec.** `features/requests/` serves the owner request flow (demo path steps
4–5): the hook loads the live offer; the detail screen counts down from
`expiresAt`; Accept/Decline transition the offer; all visible text comes from
`copys/`.

**Edit surface.** `apps/owner/features/requests/**`, plus the `test` script in
`apps/owner/package.json` (widen it to
`node --test "lib/**/*.test.ts" "features/**/*.test.ts"` so the new tests run
under `npm test`). Shared state enters
via props (DOM serializable-props rule). Do not touch `app/`, `shared/`,
`lib/`, or other features; if something looks missing there, report it.

**Write these tests first, show them failing (RED), then stop for review:**

1. `features/requests/lib/countdown.test.ts`
   - `formatCountdown(272)` → `"4:32"` (demo value).
   - `formatCountdown(0)` → `"0:00"`; negative input clamps to `"0:00"`.
   - `secondsLeft("2026-10-28T00:10:00-05:00", "2026-10-28T00:05:28-05:00")` → `272`
     (`req_ana.expiresAt` from `shared/data/mock.ts`; `now` is injected).
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

## T4 assignment (Claude Sonnet 5.5 subagent, effort high): chats slice

**Spec.** `features/chats/` serves the owner chat (demo path step 6, "chat
with polish"). Sources: `handoff-ui/owner-app/HANDOFF-RN-UI.md` §8 "Chat
(`OwChat`, polish off = option A)" and "Chat with polish on (`OwChatPolish`,
option B)", §9 `sendMessage(convId, text, {polish})` → `{sent}` or a
`PolishPreview`; copy and layout from `design/html/OwChat.dc.html` and
`OwChatPolish.dc.html`. Acceptance (§ checklist): "Option A and option B both
work, and the metadata under the bubble matches what was sent."

- Option A (polish off): Send delivers the text exactly as written;
  `delivery: "as_written"`, metadata "sent as written".
- Option B (polish on): Send does not send; it returns a `PolishPreview` and
  the composer becomes `PolishCompare` ("You wrote", "Zukki's version ·
  English, Ana's language", "Send mine" / "Send Zukki's"). "Send Zukki's"
  sends `polished` with `delivery: "polished"` and `ownerDraft` = original;
  "Send mine" sends the original as option A.
- Polish switch remembered per chat; default `false` until Settings exists.
- While polishing: "Polishing…"; on failure "Couldn't polish. Send yours or
  try again." (strings from HANDOFF-RN-UI §8).

Demo literals: `OWNER_TEXT`, `POLISHED_TEXT`, `conversations` (`c_ana`) from
`shared/data/mock.ts`. The `c_ana` thread starts from `anaMessages` (m1, m2)
in `mock.ts`; the fake client seeds inside `features/chats/services/`; do
not edit `shared/`.

Out of T4: the `OwChats` list (keep `ChatsScreen` placeholder),
`SuggestionRow`, the "View job and evidence" link target (T5), the Settings
default, the phone button toast.

**Edit surface.** `apps/owner/features/chats/**`; in GREEN only, the new route
`apps/owner/app/chat/[id].tsx` (thin adapter: hook result → screen;
`app/request/[id].tsx` already navigates to `/chat/c_<offerId>`). Do not touch
`shared/`, `lib/`, other features, or other routes; report gaps instead.

**Write these tests first, show them failing (RED), then stop for review:**

1. `features/chats/lib/*.test.ts` — the A/B delivery rule (pure): message
   built from as-written vs polished input (`text`, `delivery`, `ownerDraft`),
   and the metadata label under each bubble.
2. `features/chats/services/conversationsService.test.ts` (fake client) —
   `getConversation("c_ana")`, unknown id → `null`, thread messages,
   `sendMessage` with polish off returns `{sent}` and appends it,
   with polish on returns a `PolishPreview` (`OWNER_TEXT` → `POLISHED_TEXT`)
   and appends nothing; sending the chosen version appends it.
3. `features/chats/copys/chatsCopys.test.ts` — every referenced key exists
   and is non-empty; demo strings verbatim: `"sent as written"`,
   `"You wrote"`, `"Send mine"`, `"Send Zukki's"`,
   `"Zukki's version · English, Ana's language"`.

**Then implement (GREEN):** `lib/`, `services/conversationsService.ts`
(injected client, fake by default, domain types from `shared/data/types.ts`,
same shape as `features/requests/services/offersService.ts`),
`hooks/useConversation.ts` (only service consumer; owns polish switch and
`composing → polishing → comparing → sent`), `copys/chatsCopys.ts`,
`components/ChatScreen.tsx` (DOM, serializable props, top-level async
callbacks), and the route.

**Report:** RED output first; after GREEN the four gates with observed
results and a one-line diff summary per file. Do not commit.

## T5 assignment (Claude Sonnet 5.5 subagent, effort high): quote + job detail

**Spec.** Demo path step "quote", plus the job the chat links to. Sources:
`handoff-ui/owner-app/HANDOFF-RN-UI.md` §8 "Quote (`OwQuote`), modal" and
"Job detail (`OwJob`)", §5 (`NumberInput`, `MetadataList`, `SuggestionRow`,
`Timeline`), §7 flows "Chat" and "Job", §9 `sendQuote(convId, quote)`,
`useJob(id)`, `updateJobStatus(id, status)`. Copy and layout from
`design/html/OwQuote.dc.html`, `OwJob.dc.html` and the suggestion row in
`OwChat.dc.html` ("Zukki suggests sending the quote: $130–160", "Review").

- Quote: "Filled in by Zukki from your prices. Change anything.";
  "Leaking toilet · Ana L."; editable lines Visit $45, Night fee $25, Fill
  valve repair $60–90; "Estimated total $130–160", recalculated live;
  `MetadataList` Arrival 12:55–1:25 AM, Technician Mario R., Note "Excludes
  floor damage"; "Ana approves it in WhatsApp. Nothing is booked until she
  does."; footer Cancel + "Send quote". Validation: "min ≤ max, positive
  whole numbers"; "Send quote" is disabled while any line is invalid.
- Total rule: total min = sum of line minimums, total max = sum of line
  maximums (same invariant as `packages/shared/src/schemas.ts` `quoteSchema`).
  A single-amount line counts as min = max.
- Job detail: title + "Approved by Ana at 12:07 AM" (success); address card
  "128 Palm Ave, apt 4", "Shared after Ana approved · 1.2 km", Map; technician
  row "Mario R." with Change; `MetadataList` Quote $130–160, Arrival
  12:55–1:25 AM; `Timeline` from `job.timeline`. Primary button follows the
  status: `customer_approved` "Start trip" → `en_route` "I'm here" →
  `on_site`; disabled after `done`.
- Location privacy (AGENTS.md): the address is shown only from
  `customer_approved` on; before that the card shows no street address.
- Chat: a `SuggestionRow` above the composer ("Zukki suggests sending the
  quote: $130–160" + ghost "Review") opens `chat/[id]/quote`; "View job and
  evidence" opens `job/[id]` for the conversation's job.

Operator decisions (do not reopen):
- No new dependency: `apps/owner` does not import `@owl-hours/shared` or zod;
  the total math is a pure `features/jobs/lib/` function.
- No feature imports another. The chat learns its job id and suggested quote
  from its own service (fake client reads `shared/data/mock.ts`: `anaJob`,
  `offers`); the jobs feature owns the quote draft, `sendQuote` and job status.
- Modal: declare `chat/[id]/quote` with `presentation: "modal"` in the root
  Stack (https://docs.expo.dev/router/advanced/modals/).
- "Send quote" returns to the chat (`router.back()`) after a successful send.
  The quote message inside the chat thread and the Jobs "Waiting for … to
  approve" line need a store shared by both features; they move to T5.1.
- The "Finish" button and `job/[id]/finish` move to T5.1; T5's footer holds
  only the status button.
- Times are wall-clock in the timestamp's own offset, like
  `features/requests/lib/sentTimeText.ts` (D7/L33).

Out of T5: `OwJobs` (keep `JobsScreen` placeholder), `OwJobDone`, Change
technician (no-op is fine, a Toast is not required), Map (static, no-op).

**Edit surface.** `apps/owner/features/jobs/**`; `apps/owner/features/chats/**`
only for the `SuggestionRow`, the chat's job id and suggested quote, and their
tests; in GREEN only, new routes `apps/owner/app/chat/[id]/quote.tsx` and
`apps/owner/app/job/[id].tsx`, `apps/owner/app/chat/[id].tsx` (wire
`onOpenJob` and `onReviewQuote`), `apps/owner/app/_layout.tsx` (modal
screen), and new Maestro flows under `apps/owner/.maestro/`. Do not touch
`shared/`, `lib/`, other features, or locked tests; report gaps instead.

**Write these tests first, show them failing (RED), then stop for review:**

1. `features/jobs/lib/*.test.ts` (pure): quote totals from lines ($45 + $25 +
   $60–90 = $130–160; a changed line recalculates); line validation (min >
   max, zero, negative, non-integer are invalid); money range text
   ("$130–160", "$45"); job status → primary action label and next status,
   disabled at `done`; address visibility per status.
2. `features/jobs/services/jobsService.test.ts` (fake client, same shape as
   `features/requests/services/offersService.ts`): `getQuoteDraft("c_ana")`
   returns the demo lines and metadata, unknown conversation → `null`;
   `sendQuote` with a valid quote resolves and marks the job `quoted`, an
   invalid quote is refused; `getJob("job_ana")`, unknown → `null`;
   `updateJobStatus` moves `customer_approved` → `en_route` and refuses a
   transition that skips a step.
3. `features/jobs/copys/jobsCopys.test.ts`: every referenced key exists and
   is non-empty; demo strings verbatim: `"Filled in by Zukki from your
   prices. Change anything."`, `"Send quote"`, `"Ana approves it in WhatsApp.
   Nothing is booked until she does."`, `"Start trip"`, `"I'm here"`,
   `"Shared after Ana approved · 1.2 km"`.
4. `features/chats/` tests for the suggestion: the `c_ana` conversation
   exposes job id `job_ana` and suggested quote `$130–160`; a conversation
   with no job exposes neither; `"Zukki suggests sending the quote:"` and
   `"Review"` copy verbatim.

List every open question with the RED report (for example: what the primary
button shows at `on_site`, and whether `sendQuote` on an already quoted job is
allowed).

**Then implement (GREEN):** `lib/`, `services/jobsService.ts` (injected
client, fake by default, domain types from `shared/data/types.ts`),
`hooks/useQuoteDraft.ts` and `hooks/useJob.ts` (only service consumers),
`copys/jobsCopys.ts`, `components/QuoteScreen.tsx` and
`components/JobScreen.tsx` (DOM, serializable props, top-level async
callbacks, Astryx controls per §5, 48px buttons, body ≥ 16px), the chat
`SuggestionRow`, the routes, and Maestro flows for chat → Review → Send
quote → back to chat, and chat → View job → Start trip → "I'm here".

**Report:** RED output first; after GREEN the gates with observed results,
e2e results, and a one-line diff summary per file. Do not commit.

## Environment notes (this machine)

- Use `/tmp/pnpm10` for installs (the system pnpm 12 cannot write this
  workspace's lockfile). Never install, format, or generate repo-wide.
- TS 7 + Astryx types need the stack-size flag above; plain `tsc` crashes.
- Do not touch `owl-3d/` or `visual-plan/` (user's uncommitted work).
