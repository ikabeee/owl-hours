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

## T5.1 assignment (Claude Sonnet 5.5 subagent, effort high): jobs list + finish

**Spec.** Demo path step "Job": "Finish" → `job/[id]/finish` → "Mark as done"
→ Jobs. Sources: `handoff-ui/owner-app/HANDOFF-RN-UI.md` §8 "Jobs (`OwJobs`)",
"Job detail (`OwJob`)" footer and "Finish (`OwJobDone`)", §7 flow "Job", §9
`useJobs(filter)`, `useJob(id)`, `finishJob(id, final)`, and "Every screen
also needs" (empty state). Copy and layout from `design/html/OwJobs.dc.html`
and `OwJobDone.dc.html`; demo numbers from `shared/data/mock.ts`.

- Jobs: `SegmentedControl` "Tonight · 2" / "Upcoming · 3" / "Done" (counts
  derived from the jobs, not hard-coded). Tonight shows `ClickableCard`s:
  "Leaking toilet", "Ana L. · Mario R. · $130–160", success line with a
  check "Approved · arrive 12:55 AM"; "Kitchen sink clogged", "Carlos M. ·
  $80–110", secondary line "Waiting for Carlos to approve" (waiting-owl
  tile). A "Tomorrow" card lists "10:00 AM · Water heater install · Lucía
  R." and "2:30 PM · Shower valve check · Grace K.". A card opens `job/[id]`.
  An empty segment shows the `EmptyState` with the owl.
- Job detail: at `on_site` the footer's "Finish" is enabled and opens
  `job/[id]/finish`; at `done` it is disabled (T5 left it disabled at
  `on_site` too).
- Finish: "Finish the job", "Leaking toilet · Ana L.", "Confirm the final
  price. Zukki sends Ana the receipt and asks for a review on WhatsApp.";
  one final `NumberInput` per quote line (Visit, Night fee, Fill valve
  repair); "Total $145" recalculated live; "Within the $130–160 estimate"
  (success) when min ≤ total ≤ max; outside it the line turns error and asks
  for a reason, and "Mark as done" needs that reason. "Photos" with Before,
  After, Add; `Switch` "Ask Ana to share the photos", "For posts. Only used
  if she says yes."; "Mark as done" saves `done`, `finalTotal` and
  `shareConsent` ("asked" when the switch is on, else "not_asked") and
  returns to the Jobs tab, where the job now sits under Done.

Operator decisions (do not reopen):
- Store scope is jobs-only (user, L39): one module-level demo jobs service
  inside `features/jobs/hooks/`, shared by `useJobs`, `useJob`, the finish
  hook and `useQuoteDraft`, so a status change on one screen shows on the
  others. Hooks still accept an injected service. The chat's quote message
  is T5.2; do not touch `features/chats/`.
- The design's other jobs are seed data: add a Carlos job (`quoted`,
  $80–110, `c_carlos`) and the two Tomorrow jobs to `shared/data/mock.ts`,
  additively; `anaJob` and every existing export stay byte-identical. A
  field the list needs (for example a scheduled time) is an optional,
  additive field on `Job` in `shared/data/types.ts`.
- `updateJobStatus` keeps refusing `done`: only `finishJob` reaches it, and
  only from `on_site`.
- Times are wall-clock in the timestamp's own offset (`shared/lib/wallClockTime.ts`).
- Retire the handoff pairs in GREEN: `OwJobs`, `OwJobDone` and `OwJob`
  (`design/{screens/*.png,html/*.dc.html}`), per the AGENTS.md retirement
  rule.

Out of T5.1: the quote message in the chat thread (T5.2), real photo
capture (Add is a no-op; Before/After are static tiles), an error state for
a rejected load (L37 gap; report it if a new screen hits it).

**Edit surface.** `apps/owner/features/jobs/**`; `apps/owner/shared/data/mock.ts`
and `apps/owner/shared/data/types.ts` additively; in GREEN only,
`apps/owner/app/(tabs)/jobs.tsx`, `apps/owner/app/job/[id].tsx` (wire
Finish), new `apps/owner/app/job/[id]/finish.tsx`, `apps/owner/app/_layout.tsx`
if the route needs a screen entry, new Maestro flows under
`apps/owner/.maestro/`, and the three retired handoff pairs. Do not touch
other features, `lib/`, or locked tests; report gaps instead.

**Write these tests first, show them failing (RED), then stop for review:**

1. `features/jobs/lib/*.test.ts` (pure): segment of a job (Tonight /
   Upcoming / Done) and the segment counts ("Tonight · 2", "Upcoming · 3");
   card subtitle ("Ana L. · Mario R. · $130–160", "Carlos M. · $80–110") and
   status line ("Approved · arrive 12:55 AM", "Waiting for Carlos to
   approve"); Tomorrow line ("10:00 AM · Water heater install · Lucía R.");
   final total from final amounts ($45 + $25 + $75 = $145); estimate check
   (inside, below, above, at both bounds); final line validation; primary
   action at `on_site` is an enabled "Finish", at `done` disabled.
2. `features/jobs/services/jobsService*.test.ts` (fake client): `listJobs`
   returns the seeded jobs as domain types; `finishJob` from `on_site`
   marks `done` with `finalTotal` and `shareConsent`, refuses any other
   status, an unknown id, invalid amounts, and an out-of-estimate total
   without a reason; `updateJobStatus(id, "done")` stays refused.
3. Shared store (hooks level, without React if possible): a status change
   through the demo service is visible to the next read from another
   consumer of the same service.
4. `features/jobs/copys/jobsCopys*.test.ts`: every new key exists and is
   non-empty; verbatim: `"Finish the job"`, `"Confirm the final price. Zukki
   sends Ana the receipt and asks for a review on WhatsApp."`, `"Mark as
   done"`, `"Ask Ana to share the photos"`, `"For posts. Only used if she
   says yes."`, `"Tomorrow"`, `"Done"`.

List every open question with the RED report (for example: which jobs make
"Upcoming · 3" when the design lists two, the copy of the out-of-estimate
line and its reason field, and where Ana's job has to be to reach Finish in
the demo).

**Then implement (GREEN):** `lib/`, `services/jobsService.ts` (`listJobs`,
`finishJob`), the shared demo service, `hooks/useJobs.ts` and a finish hook
(only service consumers), `copys/`, `components/JobsScreen.tsx` (DOM,
replacing the placeholder) and a finish screen (DOM, serializable props,
top-level async callbacks, Astryx controls per §5, 48px buttons, body ≥
16px), the routes, and a Maestro flow: Jobs → Ana's job → Start trip → I'm
here → Finish → Mark as done → Ana under Done.

**Report:** RED output first; after GREEN the gates with observed results,
e2e results, and a one-line diff summary per file. Do not commit.

## T5.2 assignment (Claude Sonnet 5.5 subagent, effort high): the quote message in the chat

**Spec.** HANDOFF-RN-UI §7 flow "Chat": "Review" on the suggestion →
`chat/[id]/quote` → "Send quote" → "back to the chat with the quote
message". No design HTML draws that message. User decision (L45): the
message mirrors what the customer receives on WhatsApp, the
`handoff-ui/whatsapp/payloads/13-quote.json` interactive message, so no copy
is invented:

- header `"Quote from {{business_name}}"` → "Quote from Northside Plumbing"
  (`business.name` in `shared/data/mock.ts`);
- body `"{{technician}} · arrives {{arrival_window}}"`, a blank line, one
  `"<label>: <amount>"` line per quote line, `"*Estimated total:
  {{total_range}}*"` (WhatsApp bold: render it bold, never the asterisks), a
  blank line, `"You pay {{technician_first_name}} after the repair."`. Demo:
  "Mario R. · arrives 12:55–1:25 AM", "Visit: $45", "Night fee: $25", "Fill
  valve repair: $60–90", "Estimated total: $130–160", "You pay Mario after
  the repair.";
- footer `"Nothing is booked until you approve"`;
- the two reply buttons `"Approve visit"` and `"Ask a question"` drawn as
  non-interactive labels (the owner cannot press the customer's buttons);
- an outgoing (owner) bubble with its time, "12:07 AM" in the demo.

Operator decisions (do not reopen):
- The store shared by chats and jobs lives in `apps/owner/shared/data/`
  (two real callers): a module-level demo thread store holding the
  conversations' messages, with a reset for tests, like
  `resetSharedDemoJobsService`. The chats fake client reads and writes it
  when it is the shared demo; `createFakeConversationsClient()` keeps
  returning independent clients.
- The jobs side appends the quote message when a quote is sent, the way the
  backend will post it to the thread: the demo jobs client writes it into
  the shared thread store on `quoted`. No feature imports another; both
  depend only on `shared/`.
- `Message` gains an optional, additive `quote?: Quote`; the message's
  `text` holds the body text (so a chat list preview has something to
  read). Everything else in `shared/data/types.ts` and `mock.ts` stays
  byte-identical.
- The body's text building is a pure function. `arrivalWindowText` moves
  from `features/jobs/lib/` to `shared/lib/` (now two callers), with its
  tests; money ranges reuse `shared/lib/moneyText.ts`.
- The chat route reloads its conversation when it regains focus
  (`useFocusEffect` in `app/chat/[id].tsx`, `reload()` on the hook), the
  D12 pattern, so coming back from the modal shows the new message.
- The copy lives in `features/chats/copys/`, quoted verbatim from
  `13-quote.json`. `13-quote.json` stays byte-identical: it retires only
  when `packages/whatsapp` sends it.

Out of T5.2: the real WhatsApp send, Ana pressing a button, the chat list
preview line, an error state for a rejected load (L37 gap).

**Edit surface.** `apps/owner/features/chats/**`,
`apps/owner/features/jobs/{hooks,services,lib}/**` (only the shared store
wiring and the `arrivalWindowText` move), `apps/owner/shared/data/types.ts`
and `mock.ts` additively, new files in `apps/owner/shared/data/` and
`apps/owner/shared/lib/`; in GREEN only, `apps/owner/app/chat/[id].tsx` and
a new Maestro flow under `apps/owner/.maestro/`. Do not touch other
features, `handoff-ui/`, or locked tests; report gaps instead.

**Write these tests first, show them failing (RED), then stop for review:**

1. Pure (`features/chats/lib/*.test.ts`, `shared/lib/*.test.ts`): the quote
   message body built from `anaJob.quote` equals the demo text above, line
   by line; one line per quote line in order; a single-amount line reads
   "$45", a range "$60–90"; the arrival line uses "12:55–1:25 AM"; the
   first-name line reads "You pay Mario after the repair."; the moved
   `arrivalWindowText` keeps its current behavior.
2. Shared store (no React): a message appended through one consumer is
   visible to the next read from another; reset returns to the seed;
   independent fake clients stay independent.
3. Cross-feature, through the public services: sending Ana's quote with the
   shared demo jobs service makes the shared demo conversations service
   return Ana's thread with one more owner message carrying the quote, at
   the jobs demo clock's time; a refused `sendQuote` (invalid quote,
   unknown conversation) appends nothing; sending twice appends two.
4. `features/chats/copys/*.test.ts`: every new key exists and is non-empty;
   verbatim: `"Quote from"`, `"Nothing is booked until you approve"`,
   `"Approve visit"`, `"Ask a question"`, `"Estimated total"`, `"You pay"`,
   `"after the repair."`.
5. One test per touched existing behavior: Ana's seeded thread, the
   SuggestionRow and polish sending are unchanged.

List every open question with the RED report (for example: whether the
SuggestionRow hides once the quote is sent, and how the bubble marks the
reply buttons as not pressable).

**Then implement (GREEN):** the shared store, the jobs wiring, the chats
lib/copys/service/hook changes, the quote bubble in
`components/ChatScreen.tsx` (DOM, serializable props, Astryx chat parts per
§5, body ≥ 16px), the route reload, and a Maestro flow: Chat → Review →
Send quote → back in the chat with the quote message visible.

**Report:** RED output first; after GREEN the gates with observed results,
e2e results, and a one-line diff summary per file. Do not commit.

## Environment notes (this machine)

- Use `/tmp/pnpm10` for installs (the system pnpm 12 cannot write this
  workspace's lockfile). Never install, format, or generate repo-wide.
- TS 7 + Astryx types need the stack-size flag above; plain `tsc` crashes.
- Do not touch `owl-3d/` or `visual-plan/` (user's uncommitted work).
