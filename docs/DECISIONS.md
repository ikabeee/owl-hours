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

## D6 — Requests slice contracts (2026-10-28)

- **Decision:** `createOffersService(client)` returns async `{ getOffer, accept, decline }`
  over a small `OffersClient` (`findOffer`, `saveOffer`); `createFakeOffersClient()`
  seeds a `structuredClone` of `mock.ts` offers per instance. Only an `offered`
  offer can be answered; any other status or unknown id resolves to `null`.
  Copys are a flat `as const` object `requestsCopys` (`acceptWithin`,
  `countdownLabel`, `ignoredNotice`, `urgent`, `approximateDistance`, `decline`,
  `acceptAndChat`). `useRequestOffer(id, deps?)` takes `{ service, clock,
  acceptWindowMin }`; the default clock starts at `DEMO_NOW` and advances with
  real time since mount, ticking once per second.
- **Why:** the demo offer expires in 2026, so a real `Date.now()` would render
  0:00; the service holds no clock (the backend owns the final expiry rule);
  the hook disables Accept and Decline at 0:00.
- **Consequences:** swapping the fake for Supabase means a new `OffersClient`
  only; `acceptWindowMin` is injected too (urgent 300 s, other 1800 s), so
  `maxSeconds` is not hardcoded in the screen.

## D7 — Chats slice contracts (2026-10-29)

- **Decision:** `createConversationsService(client)` returns async
  `{ getConversation, getMessages, sendMessage, sendPolishChoice }`.
  `sendMessage(convId, text, {polish})` returns `{sent}` or a `PolishPreview`
  (HANDOFF-RN-UI §9) and `null` for an unknown conversation; a preview appends
  nothing. `sendPolishChoice(convId, preview, "mine" | "zukki")` sends option A
  (`as_written`) or option B (`polished`, `ownerDraft` = original). The label
  under an option B bubble is the §8 string "Written with Zukki, approved by
  Northside" (no invented copy). The `c_ana` thread seeds from `anaMessages`
  (m1, m2), so the owner types `OWNER_TEXT` live in the demo.
  `useConversation(id, deps?)` is the only service consumer and owns the polish
  switch (default off, not persisted) and `composing → polishing → comparing →
  sent`. Default message ids come from a counter (no `crypto` on Hermes).
- **Why:** user-approved answers to the T4 RED review (L12).
- **Consequences:** the Settings default for polish and the metadata time are
  not wired; "You accepted at" formats device-local time.

## D8 — Accept opens the chat by offerId (2026-10-29)

- **Decision:** `OffersService.findChat(offerId)` returns the conversation id
  of an accepted offer (`null` otherwise); `useRequestOffer().accept()` returns
  that id and the route navigates with it.
- **Why:** the route built `c_${offerId}` (`c_req_ana`), but the conversation is
  `c_ana`; ids are not derivable by naming (`c_grace` belongs to `req_grace2`).
  A real backend creates the chat on accept and returns it.
- **Consequences:** `OffersClient` gains `findConversationId(offerId)`.
