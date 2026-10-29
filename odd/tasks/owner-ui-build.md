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
- T4.1: fix the 6 T4 review follow-ups (L14), S2-S3, route: delegated (user:
  "deja agentes desarrollando"), 2 parallel units with disjoint surfaces:
  U1 chats (items 1, 2, 4, 5, 6), U2 requests (item 3); Sonnet 5.5 high,
  status: done (GREEN)
- T3.1: request evidence + possible faults, S2-S3, route: delegated (Claude
  Sonnet 5.5, effort high), branch `feat/owner-request-evidence`
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
- L14 (2026-10-29): RDD review of `34267d2..ef12f65` (medium; user granted).
  One lens (reliability), approved and acknowledged. Non-blocking follow-ups:
  (1) `sendChoice` has no in-flight guard, so a double tap sends twice;
  (2) polish-off `send` does not catch a rejection, so the draft is lost;
  (3) accept succeeds but navigation is skipped when no chat maps to the offer;
  (4) an empty thread renders "You accepted at Invalid Date";
  (5) the `useConversation` state machine has no test;
  (6) a failed load leaves a blank screen.
- L15 (user, 2026-10-29): "Corrige esos 6 puntos, deja agentes
  desarrollando". Item 5 (untested hook) is solved by extracting the
  composer state machine into a pure `lib/` reducer tested with node --test
  (the repo has no React test setup). Item 3 fallback: when an accepted offer
  maps to no chat, navigate to the chats tab instead of staying put.
- L16 (2026-10-29): T4.1 RED was 51 new tests (U1 48, U2 3), reviewed by the
  operator and locked. The operator accepted the coders' proposals: a
  framework-free session module, no reload after a send, and the failed-send
  copy reused from §466. Both units reached GREEN in parallel; neither touched
  a locked test, and each diff stayed in its surface.
  Seam check (operator):
  - owner `npm test`: 128/128;
  - owner tsc: clean;
  - `expo export`: OK;
  - root `npm test`: 3/3;
  - root typecheck: 5/5.
  D9 is in `docs/DECISIONS.md`. The lock is removed.
  Open items:
  - `not_found` renders blank, because the handoff has no copy for it;
  - none of this was run on a device or browser.
  Next: T5 jobs slice.
- L17 (2026-10-29): RDD review of the whole branch `34267d2..89b37ba` (medium;
  user granted). One lens (reliability), approved and acknowledged.
  Non-blocking follow-ups:
  (1) `useRequestOffer.ts:63-67`: a rejected `findChat` after a committed
  accept leaves the owner on the request screen;
  (2) `ChatScreen.tsx:203-206`: restoring the draft overwrites text typed
  while a send was in flight, including after a refused second tap.
- L18 (user, 2026-10-29): "Manda los PR's bajas maestro con el emulador de
  IOS (ya ando en mi casa) para que hagas e2e de las pantallas y me muestres
  los resultados. Antes de mandar PRs me mandas los ss".
  Setup:
  - iOS 27 simulator runtime downloaded;
  - "Zukki iPhone" simulator (iPhone 16) created;
  - Expo Go installed through `expo start --ios`;
  - Maestro with JAVA_HOME=openjdk@17.
  Flows are in `apps/owner/.maestro/`.
  Shell bugs found and fixed (both predate T4):
  - Expo Router 58 renders only the screens a layout declares, and
    `app/(tabs)/_layout.tsx` declared none (blank app); TABS is now exported
    and declared;
  - "/" had no route, so a cold start landed on Jobs; `app/index.tsx` now
    redirects to `/requests`.
  E2E result: 4/6 pass (tabs, request detail, accept→chat, decline).
  Open findings:
  - (a) ChatScreen renders at about half width and the accepted-at line is
    clipped ("AM");
  - (b) Maestro `inputText` cannot type into the WebView composer, so
    option A and option B are not verified e2e;
  - (c) replacing a DOM screen while it loads logs "Unable to find the
    'DomWebView' view with tag" (dev LogBox);
  - (d) the Requests tab is still a placeholder.
- L19 (user, 2026-10-29): "corrije el layout".
  - Root cause: in the native DOM host, `.zukki-root` is a flex item that
    shrinks to its content width. ChatLayout's `container-type: inline-size`
    contributes 0, so the TopBar (~170 pt) set the width. Chromium web and
    iOS Safari render full width.
  - Fix: `width: 100%` on the ChatScreen root.
  - Verified in Expo Go on the iOS simulator: full width, and "You accepted
    at 12:05 AM" is intact.
  - E2E: option B now passes end to end, since typing works at full width.
  - Flaky: option A and accept→chat failed once. In one, the tap on Send
    landed on the dev LogBox toast ("Unable to find the 'DomWebView' view").
    In the other, the WebView accessibility tree was missing a visible text.
  - Observation: after a send, the new bubble sits under the dock until the
    owner scrolls; the scroll-down button shows.
- L20 (user, 2026-10-29): "Arregla el scrol".
  - Cause: ChatLayout follows new content only while locked at the bottom
    (`useChatStreamScroll`). Keyboard and dock resizes unlock it, so the
    owner's new bubble stayed under the dock.
  - Fix: `arrivedOwnMessage` (pure, `lib/followLatest.ts`, 5 tests,
    RED→GREEN) drives `FollowOwnMessages`, which scrolls ChatLayout's
    `scrollContainerRef` to the end after each own send. Reduced motion
    jumps instead of smooth-scrolling.
  - Verified: option A passed alone on the simulator; the "On my way, 12:55
    · sent as written" bubble is visible above the dock with the keyboard
    open.
  - Flow hardening:
    - the subflow passes through /requests to remount the target;
    - Enter submits instead of a Send tap.
  - Still flaky in the full suite: dev LogBox "Unable to find the
    'DomWebView' view" errors stack up across navigations and cover the
    screen. Unit tests: 133/133.
- L21 (user, 2026-10-29): "Por que esta ese error?" then "Sí, haz las tres".
  - Cause: expo@58 `src/dom/webview-wrapper.tsx` `emit()` calls
    `injectJavaScript` (an iOS AsyncFunction in
    `@expo/dom-webview/ios/DomWebViewModule.swift:133`) without a catch.
    When the WebView is already unmounted, expo-modules-core rejects with
    "Unable to find the 'DomWebView' view with tag".
  - Our triggers:
    - DOM actions that navigate before returning (Accept, Decline, Back);
    - fast deep-link navigation (e2e).
  - (1) `shared/navigation/leaveAfterReturning` defers navigation one
    macrotask (2 tests, RED→GREEN, node mock timers). It is used by the
    request and chat routes. The test script now includes
    `shared/**/*.test.ts`.
  - (2) `LogBox.ignoreLogs` for exactly that message in `app/_layout.tsx`;
    it still reaches the console.
  - (3) Upstream: #50679 (same bug, Android) was closed by expo-bot for a
    missing repro, not fixed; #49173 (Android cold start) is open. Ours
    reproduces on iOS. A valid report needs a public minimal repro repo,
    which awaits the user's go-ahead.
  - Flows:
    - wait on "Message input" (a stable a11y label);
    - close the keyboard ("Done") before tapping Send, inside `retry`,
      because the accessory bar covers Send.
  - E2E: 6/6 in the final full run; the chat flows passed 3/3 in
    isolation. Unit tests: 135/135.
  - Note: XCUITest typing into the WebView once dropped the last character
    ("12:5").
- L22 (user, 2026-10-29): "Go ahead y muestra las evidencias ademas
  necesito las capturas de los tests e2e en el historial de git".
  - E2E screenshots are committed in `apps/owner/.maestro/evidence/`
    (f12f6cc).
  - Upstream repro https://github.com/ikabeee/expo-dom-ios-mount-rejection-repro
    shows that mounting one DOM component rejects on 3 of 3 iOS cold starts.
    It needs no interaction or navigation. Issue
    https://github.com/expo/expo/issues/52503.
  - Correction to L21: the repro's navigate-inside-action tap did NOT
    reject (error count unchanged), so the real cause is the mount race of
    the `$$props` `emit`, not unmount. `leaveAfterReturning` therefore had
    no proven effect and is reverted. `ignoreLogs` stays, with its comment
    pointing to #52503.
  - After the revert: E2E 6/6, unit 133/133, tsc clean.
- L23 (2026-10-29): stacked PRs to main, cut at the commit boundaries:
  - #15 T4 chats slice (`feat/owner-chats-t4`, +1052/-7);
  - #16 T4.1 review fixes (`fix/owner-chats-t4-review`, +1051/-136);
  - #17 iOS e2e fixes plus evidence (`fix/owner-ios-e2e`, +359/-5).
  #15 and #16 request `size:exception`: each is one work unit, about half
  tests, and splitting them means rewriting history. Merge order:
  #15 → #16 → #17. Next: T5 jobs slice.
- L24 (2026-10-29): RDD review of the whole stack (user granted).
  - Blocking finding, CRITICAL, R3-polish-failed-draft-lost: with polish
    on, a failed polish lost the draft because Composer unmounts while
    polishing.
  - Correction 5ff2753, 20 lines: the draft is lifted into Footer, which
    stays mounted.
  - Validation: the first validator run died ("transport failed: signal:
    killed"); the same slot was reoffered and the second run approved.
    Acknowledged.
  - Checks: unit 133/133, tsc clean; e2e A, B and accept 3/3.
  - Non-blocking follow-ups:
    (1) a rejected `findChat` after a committed accept leaves the owner
    stranded;
    (2) restoring the draft overwrites text typed during an in-flight send;
    (3) `not_found` chat is a blank screen.
- L25 (user, 2026-10-29): "hay demasiado padding en las pantallas", "Muchos
  espacios en blanco", "No necesitamos un switch para polish, sino que sea
  un icono que cargue y muestra a zukki interactuando", "copia este layout
  de whatsapp pero manteniendo el mismo estilo de ui", "esta perfecto,
  mientras pule zukki debe estar 'trabajando'".
  - Padding: the DOM routes pass `contentInsetAdjustmentBehavior: 'never'`.
    Expo's wrapper default "automatic" added the safe area on top of the
    screens' own insets.
  - White space: ChatLayout `density="compact"`.
  - Composer:
    - an Astryx InputGroup pill (`.zukki-pill` sets `--radius-element`)
      holding the Zukki owl IconButton toggle (`aria-pressed`) and a
      TextInput labelled "Message";
    - a round primary Send outside the pill;
    - while polishing the owl runs in color (`aria-busy`, not disabled) and
      the field shows "Polishing…";
    - the Switch is removed.
  - Checks: E2E 6/6 (flows tap "Message" index 1), unit 133/133, tsc clean.
- L26 (user, 2026-10-29): "Haz squash and merge, y empezamos una nuvea
  sesion".
  - #15 → #16 → #17 → #18 are squash-merged into main in order. Each
    branch is rebased onto main with `--onto` after the previous squash.
  - Upstream: expo/expo#52503 (issue) and expo/expo#52509 (fix PR). Remove
    `LogBox.ignoreLogs` in `app/_layout.tsx` once a release ships the fix.
  - Open follow-ups from the reviews:
    - a rejected `findChat` after a committed accept strands the owner;
    - restoring the draft overwrites text typed during an in-flight send;
    - `not_found` chat is a blank screen;
    - the message field is single-line.
  - Next: T5 jobs slice (quote). E2E runs with Maestro on the "Zukki
    iPhone" simulator: `npx expo start --ios` in `apps/owner`, then
    `maestro test .maestro` with JAVA_HOME=openjdk@17.
- L27 (user, 2026-10-29): "me referia al handoff que se le enviaba al
  owner business en la app" / "Agrega también la lista de posibles fallas.
  Y tenemos que agregarlo a la UI".
  - Gap: HANDOFF-RN-UI §8 "Request detail" asks for "video `Thumbnail`
    (→ `Lightbox`)", "the customer's quote in italics" and "`ZukkiTag` +
    summary". T3's RequestScreen renders only the title, name, distance and
    zukkiSummary.
  - New requirement (not in the handoff): a structured list of possible
    faults on the request.
- L28 (user, 2026-10-29): "Go".
  - T3.1 RED approved: 23 new tests, 20 failing; existing 133 green.
  - Approved answers:
    - the media banner is the Astryx `Thumbnail` sized to the design's
      326×128 via `style`;
    - the ZukkiTag avatar reuses the owl `static` frame (no new binary);
    - the Lightbox shows the thumbnail with "Video · 0:14" (no real video in
      the demo);
    - the sent time is device-local, as in D7.
  - New copy approved: "Possible faults", "Likely", "Possible", "Photo".
  - Tests locked (`t3.1-request-evidence`).
- L29 (2026-10-29): T3.1 GREEN.
  - The coder built the evidence UI, the possible faults list (Badge) and
    `sortLikelyFirst` / `mediaDurationText` in lib.
  - The operator added the sticky bottom action bar: the longer card had
    pushed Decline / Accept and chat off screen, and 3 e2e flows failed
    until it was in place.
  - New e2e flow `07-request-evidence`.
  - Checks: unit 156/156, tsc clean, e2e 7/7.
  - D10 is in `docs/DECISIONS.md`. Lock removed.
- L30 (2026-10-29): RDD review of T3.1 (medium; user granted). One lens
  (reliability), approved and acknowledged. Non-blocking follow-ups:
  (1) no test drives `useRequestOffer` to prove sorted faults or the
      empty-list default;
  (2) `CustomerMedia` renders a blank banner for any media that is not
      the demo frame (no fallback);
  (3) the alt text always says "video frame", even for photos;
  (4) an unknown likelihood value would throw;
  (5) "Sent by Zukki" shows device-local time, unasserted by e2e.
- L31 (user, 2026-10-29): "Sí, corrige la 2 y abre el PR".
  - Follow-up (2) fixed: `lib/mediaFrameSource` (4 tests, RED→GREEN)
    resolves a demo id to its frame and keeps https/data URLs; anything
    else returns null.
  - `CustomerMedia` then shows only the caption, so no blank banner is
    drawn. The lightbox hook moved into `MediaBanner`, which mounts only
    when there is a frame.
  - Checks: unit 160/160, tsc clean, request e2e flows 3/3.
- L32 (2026-10-29): RDD review of T3.1 plus the banner fix (user granted),
  approved and acknowledged.
  - It found that `mediaFrameSource` resolved inherited property names
    ("constructor") to a Function.
  - Fixed with `Object.hasOwn` (3 tests, RED→GREEN; unit 163/163).
  - Still open from the review:
    - no test drives the hook;
    - the photo alt text says "video" (now reachable with real URLs);
    - an unknown likelihood throws;
    - the sent time is device-local.
