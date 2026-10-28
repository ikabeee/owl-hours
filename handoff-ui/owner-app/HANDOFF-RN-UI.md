# Handoff: Zukki for Business UI with Expo + Astryx

Brief for the agent building the **owner app** UI. The customer side is WhatsApp; it is not part of this app.

**Component library: Astryx** (https://astryx.atmeta.com/, `@astryxdesign/core`). Astryx is a **web** React library (React DOM + pre-built CSS); its React Native package is an unpublished experiment. So the app is:

- **a native Expo shell**: navigation, tab bar, push notifications, haptics, safe areas, data;
- **screens drawn with real Astryx components** through **Expo DOM components** (`'use dom'`).

> **Verified on Oct 27, 2026** with Expo SDK 58, `expo-router` 58, `@expo/dom-webview` 58, `@astryxdesign/core` 0.7.4 and `@astryxdesign/theme-neutral` 0.7.4. `starter/` contains a request screen built with Astryx inside a DOM component, wired to an `expo-router` route. It type-checks, it bundles for Android with `expo export`, and its DOM bundle renders as expected (screenshot in `design/astryx-dom-proof.png`).

Read in order:
1. This file.
2. `design/screens/*.png`: what each screen looks like (2×). `design/overview.png` has all 27 on one sheet.
3. `design/html/*.dc.html`: the same screens as HTML, with exact copy, spacing and structure. **The HTML is the source of truth for content and layout. Astryx is the source of truth for how each control looks and behaves.** Where an Astryx control differs slightly from the mock (switch size, focus ring, radio style), Astryx wins.
4. `starter/`: the verified files (§11).
5. Astryx docs for agents: run `npx @astryxdesign/cli component <Name>`, `npx @astryxdesign/cli search <word>` and `npx @astryxdesign/cli docs tokens`. **Check a component's props with the CLI before using it; don't guess.**
6. Product context: `docs/01-PRODUCT.md`, `docs/02-HANDOFF.md`, `docs/03-ARCHITECTURE.md` (in the main docs zip).

---

## 1. What the app is

Zukki is an AI assistant on WhatsApp that finds people a local business (any category) and connects them with it. When a customer needs help, Zukki picks one nearby business and offers it the request. **Zukki for Business** is that business's app. In it, the owner:
- accepts a request in time (5 minutes if urgent, 30 otherwise),
- chats with the customer (the customer stays on WhatsApp), optionally letting Zukki polish the message,
- sends a quote, follows the job, and approves posts Zukki drafts for the Facebook Page and Instagram.

Users are owners aged 25–50, often on the road, on one hand, sometimes woken at night. Design for fast decisions:
- one primary action per screen,
- large type,
- nothing that needs precision tapping.

---

## 2. Stack (versions verified for SDK 58)

| Need | Package |
|---|---|
| App | `expo` ~58, TypeScript strict |
| Navigation | `expo-router` ~58.0.27, `react-native-screens`, `react-native-safe-area-context` ~5.10.1 |
| DOM components | `@expo/dom-webview` ~58.0.2 (default renderer from SDK 56), `react-dom` **19.3.0, matching `react` exactly**, `react-native-web` ~0.21.4, `@expo/metro-runtime` ~58.0.15 |
| UI library (inside DOM screens) | `@astryxdesign/core`, `@astryxdesign/theme-neutral`, `@stylexjs/stylex` (peer); `@astryxdesign/cli` (dev, docs for agents) |
| Icons | Inside DOM screens: `lucide-react`, passed to Astryx `Icon`/`IconButton` (Astryx's built-in set is small). Native tab bar: `lucide-react-native` + `react-native-svg` |
| Native extras | `expo-notifications`, `expo-haptics`, `expo-image` (native only), `@expo-google-fonts/figtree` (native tab bar labels) |
| Data (later) | `@supabase/supabase-js` in the native layer. For this UI task, use `starter/mock.ts` behind `data/` hooks (§9) |

Notes:
- `npx expo install` resolves versions through Expo's servers. If it isn't available, pin to the versions above with `npm install`.
- If `react-dom` and `react` differ by even a patch version, npm fails with ERESOLVE. Pin `react-dom` to the exact `react` version.
- **Known issue:** `tsc` can crash with "Maximum call stack size exceeded" on files that import Astryx. Run `node --stack-size=16000 ./node_modules/typescript/lib/tsc.js --noEmit`; it then passes cleanly.
- Don't add other UI kits. Don't write StyleX (`stylex.create`) in app code; Metro has no StyleX plugin here. For layout glue, use Astryx layout components and small plain CSS files.

---

## 3. Architecture: native shell, Astryx screens

```
app/                          expo-router routes (NATIVE). Each route:
  request/[id].tsx              - reads data from data/ hooks
                                - passes serializable props + async callbacks
                                - renders <RequestScreen … dom={{ style: { flex: 1 } }} />
components/screens/           one 'use dom' file per screen (WEB, Astryx)
  RequestScreen.tsx             - draws the whole screen: top bar, content, bottom bar
  …
components/dom/               shared DOM-side pieces (Owl, ZukkiTag, Countdown, …), imported by screens
components/zukki-theme.css    Zukki overrides on Astryx Neutral (§4)
components/native/            TabBar and anything else native
data/                         hooks: mock now, Supabase later (§9)
```

**Native side owns:**
- navigation (stack + tabs);
- the **tab bar**;
- push notifications and deep links;
- permissions;
- haptics;
- safe-area insets;
- data fetching and mutations;
- secure storage;
- the splash screen.

**DOM side owns:**
- everything the user sees inside a screen;
- local UI state: form fields, sheet open or closed, which polish version is selected, the countdown tick.

**Rules for DOM components** (from Expo's docs; the starter follows them):
- **Props must be serializable** (strings, numbers, booleans, arrays, plain objects). Any prop change re-renders the whole DOM tree, which is fine at this size.
- **Callbacks are top-level, async props only**, like `onAccept: () => Promise<void>`. They can't be nested in objects, can't return values synchronously, and their arguments must be serializable.
- **No `children` and no native views inside a DOM component.** Each screen is self-contained.
- Pass **safe-area insets** as props and apply them as padding inside the screen.
- Navigate by calling a native callback (`onOpenChat(id)`), not with links inside the DOM screen.
- Global state is **not shared** between DOM screens. Anything two screens need comes from native props.

**Risks to check on day 1** (on a real mid-range Android phone and an iPhone):
1. **Startup:** each DOM screen loads a web bundle (the probe screen was ~2.8 MB unminified JS + 194 KB of Astryx CSS). Measure the cold open of `request/[id]` from a notification tap. If it's over ~1 s, keep tab screens mounted (don't unmount on blur) and pre-warm the request screen at app start.
2. **Keyboard in chat:** test the Astryx `ChatComposer` with the soft keyboard on Android and iOS. If the input hides behind the keyboard and can't be fixed with `dom` props or layout, render the composer **natively**, below the DOM thread. That is the only allowed exception.
3. **Scrolling:** each screen scrolls inside its own web view. Put a scroll area between a fixed top bar and a fixed bottom bar; don't scroll the whole document.

---

## 4. Theme

Inside every DOM screen, in this order (verified):

```tsx
'use dom';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import '@astryxdesign/theme-neutral/fonts.css';   // Neutral's font is Figtree (Google Fonts)
import './zukki-theme.css';                        // our overrides, last

<Theme theme={neutralTheme}>                         // from '@astryxdesign/theme-neutral/built'
  <div className="zukki-root" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
    …
  </div>
</Theme>
```

`zukki-theme.css` (in the starter) sets, on `.zukki-root`:
- `--color-accent: #0074e2`. Neutral's own accent is near-black; ours is Astryx blue-50.
- `--size-element-lg: 48px` for primary actions, and `--size-element-md: 44px` for the minimum touch target.
- `color-scheme: light`. The designs are light-only for now.

The overrides live on the wrapper, so they win over the provider's values by inheritance. Add new overrides there, never inline.

**Fonts:**
- `fonts.css` loads Figtree from Google Fonts, so the phone needs a connection on first launch. Until it loads, Neutral falls back to the system font, which is acceptable.
- Local `url()` font files in a DOM component's CSS are **not** bundled by Metro (verified), so don't try that.

**Rules (the team rejects these on sight):**
- **No pastel chips.** Never use Badge's non-semantic variants (`blue`, `cyan`, `green`, `orange`, `pink`, `purple`, `red`, `teal`, `yellow`); those are tinted backgrounds.
  - Badge is allowed only as a **solid count** (`variant="error"`), for example unread counts.
  - Show status as `Text` in a semantic color, optionally with `StatusDot` or a check icon.
- **No colored or tinted cards.** `Card` only uses `variant="default"` (or `muted` for neutral grouping). Never the colored variants (`blue`, `green`…). No colored side stripes or frames.
- **No `Banner` for status messages**, because its status styles are tinted. Use a plain `Text` line, or `Toast` for transient confirmations.
- Accent is used only for primary buttons, text actions ("Review", "Manage", "Change"), switches that are on, and the active tab.
- No gradients, glassmorphism, glows, or emoji in UI copy.
- Body text ≥ 16px: Neutral already floors the phone type scale at 16px on touch screens, so don't override it smaller. Metadata is 13–14px, and nothing is below 12.5px.
- One primary button per screen, in the bottom bar.

---

## 5. Design element → Astryx component

Import from the subpath, for example `import {Button} from '@astryxdesign/core/Button'`. All the paths below exist in `@astryxdesign/core` 0.7.4.

| In the designs | Use | Notes |
|---|---|---|
| Screen frame | `Layout` with `LayoutHeader` / `LayoutContent` / `LayoutFooter` (`/Layout`), or `VStack` + a scroll area | Header = top bar, footer = bottom action bar |
| Stacks and spacing | `VStack`, `HStack` (`/Layout`), with `gap` and `padding` on Astryx's spacing steps (0–10) | `justify` takes `start \| center \| end \| between \| around \| evenly` |
| Top bar (back, title, subtitle, right icon) | `HStack` + `IconButton` (needs `label`) + `Heading`/`Text` | Not `TopNav` (that's desktop navigation) |
| Large tab title | `Heading level={1}` | |
| Card / raised live-request card | `Card` (`padding`, `elevation` for the live request only) | Default variant only |
| Tappable card (job, draft, request) | `ClickableCard` | |
| List rows: link rows, setting rows | `List` + `ListItem` (`/List`) or `Item` | Hairline dividers come from the list |
| Primary / secondary / danger / text button | `Button` with `variant` `primary` / `secondary` / `destructive` / `ghost`, `size="lg"`, `label` | `width="100%"` for full width. 1fr + 2fr pairs: a CSS grid wrapper (see starter) |
| Icon-only button | `IconButton` (`label` + `icon`) | |
| Switch | `Switch` (`label`, `value`, `onChange(checked)`; use `isLabelHidden` when the row shows its own label) | Astryx size `md` (40×24) replaces the mock's 42×26 |
| Text field | `TextInput` inside `Field`, or with its own label | Helper text: `description` / `status` |
| Money fields | `NumberInput` | Ranges like "$60–90" as two inputs or a `TextInput` with validation |
| Checkbox / radio list | `CheckboxInput`, `RadioList` + `RadioListItem` | Decline reasons = `RadioList` |
| Service radius | `Slider` | |
| "Step n of 3" | `ProgressBar` (`value`, `max=3`, `label="Step 1 of 3"`) | `Stepper` is too heavy for a 3-step header |
| Countdown "4:32" + bar | `Text` with tabular figures + `ProgressBar variant="neutral"` (`isLabelHidden`) | Not `Timer` (that's elapsed time) |
| Urgent dot / status dot | `StatusDot` (`variant`, `label`) | |
| Bottom sheet (decline) | `BottomSheet` (`label`, `isOpen`, `onOpenChange`) | |
| Segmented control (Jobs) | `SegmentedControl` + `SegmentedControlItem` | |
| Avatar with initials | `Avatar` (`name` → initials, `size`) | |
| Image thumbnail / full-screen media | `Thumbnail`; `Lightbox` / `useLightbox` | Video playback: a plain `<video>` inside the lightbox |
| Key–value rows (quote, arrival, technician) | `MetadataList` + `MetadataListItem` | |
| Times ("12:07 AM", "Yesterday") | `Timestamp` | |
| Chat thread | `ChatLayout`, `ChatMessageList`, `ChatMessage`, `ChatMessageBubble`, `ChatMessageMetadata`, `ChatSystemMessage` (`/Chat`) | System line: "You accepted at 12:05 AM" |
| Chat composer | `ChatComposer`, `ChatComposerInput`, `ChatSendButton`; `ChatDictationButton` for the mic | Keyboard: check on day 1 (§3) |
| Empty / error states | `EmptyState` (`title`, `description`, `icon` = the owl, `actions`) | |
| Loading | `Skeleton` | No shimmer |
| Transient confirmation ("Quote sent") | `Toast` / `useToast` | |
| Divider with "or" | `Divider` | |
| Count badge (unread) | `Badge variant="error"` | Solid only |
| **Tab bar** | **Native** (`expo-router` `Tabs` with a custom `tabBar`), styled from `starter/native-tokens.ts` | 5 tabs, no pill behind the active tab, solid red count |

**Custom pieces** (DOM side, built from Astryx parts and tokens; put them in `components/dom/`):

| Piece | Built from | Seen in |
|---|---|---|
| `Owl` | §6 | many |
| `ZukkiTag` | 20px `Avatar src=avatar.png` + "Zukki" `Text type="label"` | request, chat |
| `ZukkiSays` | `Owl` (small, clipped) + a speech bubble (radius 16 16 16 4, `--color-background-muted`) | sign up, setup 2 |
| `SuggestionRow` | `HStack` + sparkle `Icon` + `Text` + `Button variant="ghost"` "Review" | chat |
| `PolishCompare` | `Text` "You wrote", `Card` with "Zukki's version", two `Button`s | chat with polish on |
| `CodeInput` | 6 boxes built on Astryx tokens; one hidden `<input inputmode="numeric" autocomplete="one-time-code">` | verify |
| `PagerDots` | 3 spans with token colors | intro |
| `Timeline` | `List` with dot + time column | job |

---

## 6. The owl (Zukki's mascot), DOM side

Files in `assets/owl/`:
- one transparent animated WebP per state, each 192×208;
- `static.png`, which is idle frame 0;
- `avatar.png`, the round head.

The app icon is `assets/brand/logo-zukki.png` (Zukki waving on `#0e1116`).

Inside DOM screens, use the starter's `components/dom/Owl.tsx` (verified in the probe; see `design/astryx-dom-proof.png`):

```tsx
import { Owl } from './dom/Owl';
import owlRunningRight from './dom/owl/running-right';   // one module per state

<Owl src={owlRunningRight} scale={0.42} clip />
```

- Each state is a small module that exports the animated WebP as a **data URI**, so it always loads inside the web view, with no asset-path questions. A screen only bundles the states it imports.
- Reduced motion is handled by the browser: `<picture>` swaps in `static` when `prefers-reduced-motion` is set.
- Importing the `.webp` file directly also bundles (Metro emits it as `{uri, width, height}`), but where that path resolves inside the native web view wasn't verified, so prefer the data-URI modules.
- **Always scale uniformly from the 192×208 cell.** Never resize to the visible bounds.
- The top ~60px of each cell is jump headroom. For grounded states shown inline, wrap the image in a box of height `(208−60)×scale` with `overflow: hidden` and `margin-top: −60×scale`. Don't clip `jumping`.
- `running` means *thinking or processing* (feet planted). `running-right` and `running-left` mean *going somewhere*.

Where the owl appears (only here):

| Screen | State | Scale |
|---|---|---|
| Intro 1 / 2 / 3 | `waving` / `running-right` / `review` | 1.3 |
| Sign up (`ZukkiSays`) | `idle` | 0.42 clipped |
| Verify | `waiting` | 0.8 clipped |
| Setup 2, prices (`ZukkiSays`) | `running` | 0.42 clipped |
| Live | `jumping` | 0.75 |
| Request detail, left of the countdown | `running-right` | 0.42 clipped |
| Decline sheet, left of the title | `failed` | 0.4 clipped |
| Jobs, awaiting approval (64×64 muted tile) | `waiting` | 0.36 clipped |
| Content, drafts header | `review` | 0.36 clipped |
| Empty / error states (`EmptyState icon`) | `idle` / `failed` | 0.6 clipped |

---

## 7. Navigation

Each route is a native file that renders one DOM screen. The comment names the design file.

```
app/
  _layout.tsx                 SafeAreaProvider, Stack (headerShown false), notification deep-link handler, auth gate
  (onboarding)/intro.tsx      OwWelcome, OwIntro2, OwIntro3 (one DOM screen with a swipe pager inside)
  (onboarding)/sign-up.tsx    OwSignUp
  (onboarding)/verify.tsx     OwVerify
  (onboarding)/business.tsx   OwProfileSetup
  (onboarding)/prices.tsx     OwPricesSetup
  (onboarding)/area.tsx       OwAreaSetup
  (onboarding)/live.tsx       OwLive
  (tabs)/_layout.tsx          native Tabs + custom native TabBar
  (tabs)/requests.tsx         OwRequests
  (tabs)/chats.tsx            OwChats
  (tabs)/jobs.tsx             OwJobs
  (tabs)/content/index.tsx    OwContent
  (tabs)/content/accounts.tsx OwAccounts (keeps the tab bar)
  (tabs)/business/index.tsx   OwBusiness
  request/[id].tsx            OwRequest + the decline BottomSheet inside the same DOM screen (OwDecline)
  chat/[id].tsx               OwChat / OwChatPolish (same screen, polish on or off)
  chat/[id]/quote.tsx         OwQuote (modal presentation)
  job/[id].tsx                OwJob
  job/[id]/finish.tsx         OwJobDone
  post/[id].tsx               OwPostReview
  business/prices.tsx         OwPrices
  business/test.tsx           OwTestZukki
  settings.tsx                OwSettings
```

**Flows:**
- **First run:** intro → sign-up → verify → business → prices → area → live → requests. "I already have an account" goes to requests. "Continue with Facebook" skips verify.
- **Push** "Urgent: leaking toilet, 1.2 km": tapping it opens `request/[id]`. The notification's Decline action opens it with the decline sheet open (`?decline=1`).
- **Request:**
  - Accept → native haptic success → `router.replace('/chat/[id]')`, so back goes to Chats.
  - Decline → sheet → "Decline request" → back to Requests, where the item reads "Declined".
- **Chat:**
  - "Review" on the suggestion → `chat/[id]/quote` → "Send quote" → back to the chat with the quote message; Jobs shows "Waiting for … to approve".
  - "View job and evidence" → `job/[id]`.
- **Job:** "Start trip" → `en_route`; "Finish" → `job/[id]/finish` → "Mark as done" → Jobs.
- **Content:** a draft → `post/[id]` → "Approve and post" → Content (Published or Scheduled); "Regenerate" asks Zukki for a new version; "Manage" → accounts.
- **Business:** "Test Zukki" → `business/test`; each row → its editor; the gear → settings; "Sign out" → intro.

**The demo path** (pitch video and live demo) is: push → request → accept → chat with polish → quote → (customer approves on WhatsApp) → next morning: post review. Build and polish this path first.

---

## 8. Screens

The copy in `design/html` is final. The figures come from `starter/mock.ts`.

### P0: the demo path and the app shell

**Tab shell.** Native tab bar with 5 tabs: Requests, Chats, Jobs, Content, Business.
- Icon 24 + label 12.5px.
- Active tab is accent and 700; inactive is `#6a6a6a` and 600.
- Requests and Chats show a solid red count.

**Requests (`OwRequests`)**
- Title "Requests" with a `Switch` labelled "Taking requests".
- "Waiting for you": the raised `ClickableCard` for the live offer, showing:
  - `StatusDot` error + "Urgent" in error + "· 1.2 km";
  - "4:32 left" at the right;
  - a 72px `Thumbnail`, the title, and "Ana L. · suggested quote $130–160";
  - a primary `Button` "Review request".
- "Earlier tonight": a `List` of past offers with the status as text (Accepted / Missed / Declined).
- Footnote: "Missed and declined requests go to another business. Customers never see why."
- **Empty states** (`EmptyState` with the owl):
  - switch off → "You're not taking requests" / "Zukki won't suggest you until you turn this on."
  - no requests → "No requests yet" / "We'll notify you when someone nearby needs you."
- When an offer expires while the screen is open, its card fades out and the row appears as "Missed".

**Request detail (`OwRequest`, with the decline sheet `OwDecline`)**
- Top bar "New request" / "Sent by Zukki · 12:05 AM".
- Countdown `Card`: owl + "Accept within" + "4:32" + `ProgressBar` + "If you don't answer, Zukki offers the job to the next business."
- Details `Card`:
  - "Urgent · Ana L. · 1.2 km, approximate";
  - the title;
  - video `Thumbnail` (→ `Lightbox`);
  - the customer's quote in italics;
  - `ZukkiTag` + summary.
- Footer: "Decline" (`secondary`, 1fr) + "Accept and chat" (`primary`, 2fr).
- `BottomSheet` "Why are you declining?":
  - `RadioList`: I'm busy right now (default) / Too far / Not a service we offer / Other;
  - the note "Zukki offers the request to another business right away. The customer won't see your reason.";
  - Cancel + "Decline request" (`destructive`).
- **States:**
  - expired while open → the footer becomes the text "This request went to another business" + "Back to requests";
  - already accepted → open the chat.
- **Never show the exact address here.** It's only revealed after the customer approves the quote.
- `starter/components/RequestScreen.tsx` is the verified starting point for this screen. Finish it to match the design.

**Chat (`OwChat`, polish off = option A)**
- Top bar "Ana L." / "via Zukki · WhatsApp" + a phone `IconButton` (no-op for now: Toast "Calling isn't available in the demo").
- Thread: `ChatSystemMessage` "You accepted at 12:05 AM", a Zukki summary card (`ZukkiTag` + "View job and evidence"), then the messages.
- `SuggestionRow` above the composer when Zukki has a suggestion.
- Send delivers the text exactly as written; `ChatMessageMetadata` under it reads "sent as written".

**Chat with polish on (`OwChatPolish`, option B)**
- Send does **not** send. It replaces the composer with `PolishCompare`:
  - "You wrote" (the owner's text);
  - a `Card` "Zukki's version · English, Ana's language";
  - "Send mine" (secondary) and "Send Zukki's" (primary).
- Only Zukki's version is labelled "Written with Zukki, approved by Northside" for the customer.
- The switch is remembered per chat; the default comes from Settings.
- While polishing: the owl `running` + "Polishing…" (max ~3 s). On failure: "Couldn't polish. Send yours or try again."

**Quote (`OwQuote`), modal**
- "Filled in by Zukki from your prices. Change anything."
- "Leaking toilet · Ana L." with `NumberInput`s: Visit $45, Night fee $25, Fill valve repair $60–90.
- "Estimated total $130–160", recalculated live.
- `MetadataList`: Arrival 12:55–1:25 AM, Technician Mario R., Note "Excludes floor damage".
- "Ana approves it in WhatsApp. Nothing is booked until she does."
- Footer: Cancel + "Send quote".
- Validation: min ≤ max, positive whole numbers.

**Post review (`OwPostReview`)**
- Facebook-style preview: business header, caption, before/after image labelled "Fixed in 91 minutes", and "Image made from your job photos. Ana agreed to share them."
- Facebook Page and Instagram checkboxes; "When: Today, 6:00 PM".
- "Edit" makes the caption editable. Footer: Regenerate + "Approve and post".
- Job photos appear only with `shareConsent="yes"`.

**Business (`OwBusiness`)**
- Logo, name, "What Zukki knows about your business", and a settings `IconButton`.
- `List` rows with values: Profile, Prices, Extra fees, Hours ("Mon–Sat 8 AM–8 PM · urgent jobs at night"), Service area (with a map strip), Website ("12 services imported").
- Footnote: "Zukki uses this to answer customers. Other businesses never see your chats."

**Linked accounts (`OwAccounts`)**
- Facebook Page: Connected. Instagram: "@northsideplumbing · professional account", Connected. (No ad account: paid ads are out of scope.)
- "What Zukki can do": two checks and one cross.
- "See today's drafts".

**Push notification** (native, `expo-notifications`)
- Title "Urgent: leaking toilet, 1.2 km".
- Body "Water is spreading. Accept within 5 minutes or Zukki offers it to another business."
- The video thumbnail as image; actions Open and Decline.
- Android: a high-importance channel "Urgent requests".

### P1: the rest

**Intro (one DOM screen with 3 slides, swipeable)**
- Each slide: the owl at 1.3, `PagerDots`, a title, a lead paragraph and a button. "Skip" on slides 1–2. Slide 3 has "Create my account" + "I already have an account".
- Copy:
  1. "Hi, I'm Zukki" / "People message me on WhatsApp when they need a local business. I find them one nearby that is open, like yours."
  2. "I bring you nearby requests" / "Day or night, I send you jobs in your area with the customer's photos or video. Urgent ones wait 5 minutes for you, the rest 30."
  3. "You have the final word" / "I suggest replies, quotes and posts. Nothing reaches a customer or your Page until you approve it."

**Sign up (`OwSignUp`)**
- `ZukkiSays` "Let's set up your account. It takes about 3 minutes."
- Your name; Mobile number ("We'll text you a code to confirm it.").
- Terms checkbox, then `Divider` "or", then "Continue with Facebook".
- "Send code", disabled until the form is valid.

**Verify (`OwVerify`)**
- Owl `waiting`, "Enter the code", then `CodeInput`.
- "Resend code in 0:24" (becomes a link at 0) and "Change number".
- Auto-submits on the 6th digit. A wrong code shows "That code didn't work. Try again." (`status` error) and shakes the boxes, unless reduced motion is on.

**Setup 1–3 (`OwProfileSetup`, `OwPricesSetup`, `OwAreaSetup`)**
- `ProgressBar` "Step n of 3".
- Step 1:
  - Logo + Change, Business name, Category, Website.
  - After the website is entered: "Reading your website…" (owl `running`), then "Imported 12 services and 4 prices" (success text + check).
- Step 2:
  - `ZukkiSays` (`running`): "I found these on your website. Check them before customers see them."
  - Price rows with edit, then "Extra fees", then "+ Add a price".
- Step 3:
  - Map card + radius `Slider` (1–20 km);
  - "Regular hours" row;
  - `Switch` "Urgent night requests · 10 PM–7 AM, with your night fee";
  - "Finish".
- Map: a static image for the hackathon.

**Live (`OwLive`)**
- Owl `jumping`, "Northside is live on Zukki", "Zukki can now suggest you for plumbing requests within 5 km."
- "Allow notifications" calls a **native** callback for the OS permission prompt.
- "Link accounts" (secondary).

**Chats (`OwChats`)**
- Search `TextInput`, then a `List` of rows: `Avatar` initials, name, `Timestamp`, last message (bold when unread, with a solid count `Badge`), and a job · status line.
- Footnote: "Customers write to Zukki on WhatsApp. Your replies reach them with your business name."

**Jobs (`OwJobs`)**
- `SegmentedControl`: Tonight · 2 / Upcoming · 3 / Done.
- `ClickableCard`s with a thumbnail (or the waiting-owl tile), title, "customer · technician · price", and a status line:
  - success text with a check: "Approved · arrive 12:55 AM";
  - secondary text: "Waiting for Carlos to approve".
- A "Tomorrow" card.

**Job detail (`OwJob`)**
- Title + "Approved by Ana at 12:07 AM" (success).
- Address card ("128 Palm Ave, apt 4", "Shared after Ana approved · 1.2 km", Map); technician row with Change.
- `MetadataList` quote and arrival, then the `Timeline`.
- Footer: Finish + "Start trip". The primary button changes with the status: Start trip → "I'm here" → disabled after "done".

**Finish (`OwJobDone`)**
- Final `NumberInput`s; "Total $145" and "Within the $130–160 estimate" (success). Outside the estimate, the line turns error and asks for a reason.
- Photos (Before, After, Add).
- `Switch` "Ask Ana to share the photos".
- "Mark as done".

**Content (`OwContent`)**
- Accounts card (Connected + Manage).
- "Drafts for you · 3" with "Made from your jobs and prices" and the owl `review`. Draft rows: a 72 thumbnail, title, source line, and "Review".
- "Published" list.

**Test Zukki (`OwTestZukki`)**
- Owl `idle` + "Ask what a customer would ask. Zukki answers with your profile, prices and hours. Customers never see this chat."
- The owner's questions are on the right (accent); Zukki's answers are on the left, under a `ZukkiTag` "Zukki would answer".
- Under each answer, the data it used ("From: Visit · Night fee · Unclog a drain") plus a text action to fix it ("Edit prices").
- When something isn't offered ("Do you repair gas heaters?"), Zukki says so and suggests another business, with the action "Add a service".
- Composer: "Ask like a customer" + send.
- Same Zukki prompt and tools as WhatsApp, scoped to the signed-in tenant, and **nothing is ever sent to a customer**.

**Edit prices (`OwPrices`).** Editable rows (`NumberInput`) + Add a price + Save.

**Settings (`OwSettings`)**
- `Switch`es: "Taking requests now", "Urgent requests", "Ring on silent at night", "Polish with Zukki by default".
- "Time to accept: 5 / 30 min" (urgent / other; read-only for now).
- "Linked accounts · 2 connected" → accounts. "Sign out" (destructive text).

### Every screen also needs
- **Loading:** `Skeleton` blocks with no shimmer, or nothing under 300 ms.
- **Empty:** `EmptyState` with the owl.
- **Error:** owl `failed` + "Something went wrong." + "Try again". Never a raw error message.
- **Offline:** one text line at the top, "You're offline. We'll send it when you're back." Queued messages show a clock icon.

---

## 9. Data contract (native → DOM)

Hooks live in `data/` on the **native** side and return mock data now, Supabase later:
- `useOffers()`, `useOffer(id)`, `acceptOffer(id)`, `declineOffer(id, reason)`;
- `useConversations()`, `useMessages(convId)`;
- `sendMessage(convId, text, {polish})`, which returns either `{sent}` or a `PolishPreview`;
- `sendQuote(convId, quote)`;
- `useJobs(filter)`, `useJob(id)`, `updateJobStatus(id, status)`, `finishJob(id, final)`;
- `useDrafts()`, `approvePost(id, opts)`, `regeneratePost(id)`;
- `useBusiness()`, `updateBusiness(patch)`, `useAccounts()`.

How screens get the data:
- The route passes **plain data** (types in `starter/types.ts`) and **async callbacks** to its DOM screen. For example, `RequestScreen` gets `offer`, `serverNow`, `insets`, `onAccept`, `onDecline(reason)`, `onBack` and `onOpenMedia`.
- The countdown is computed inside the DOM screen from `offer.expiresAt` and a `serverNow` offset passed as a prop. Never rely on the phone clock alone.
- Accept and decline handle the race where the offer just expired: the native callback returns, the route re-reads the offer, and the screen shows the expired state.
- `DEMO_NOW` in `mock.ts` freezes time so the demo matches the designs (12:05 AM, 4:32 left). Put it behind a `DEMO_MODE` flag.

---

## 10. Assets

```
assets/
  owl/        idle|waving|running|running-right|running-left|jumping|failed|waiting|review.webp, static.png, avatar.png
  brand/      logo-zukki.png (app icon, 512), logo-northside.svg, logo-eastside.svg
  img/        bath-leak.svg, bath-fixed.svg, hero-night.svg, map-city.svg, avatar-mario.svg  (demo content)
design/
  overview.png             all 27 screens, in flow order
  screens/                 each screen, 2× PNG
  html/                    each screen as HTML (img/ alongside)
  astryx-dom-proof.png     the starter's request screen rendered from the Expo DOM bundle
starter/                   see §11
tokens.json                the design tokens as JSON (reference)
```

Icons (lucide):

| Name in the designs | Lucide icon |
|---|---|
| Requests | `Inbox` |
| Chats | `MessageCircle` |
| Jobs | `CalendarDays` |
| Content | `Megaphone` |
| Business | `House` |
| Back | `ArrowLeft` |
| Settings | `Settings` |
| Send | `SendHorizontal` |
| Mic | `Mic` |
| Phone | `Phone` |
| Suggestion | `Sparkle` |
| Pin | `MapPin` |
| Camera | `Camera` |
| Bell | `Bell` |
| Edit | `Pencil` |
| Add | `Plus` |
| Check | `Check` |
| Chevron | `ChevronRight` |
| Search | `Search` |

Inside DOM screens use `lucide-react`; in the native tab bar use `lucide-react-native`.

The app icon needs a higher-resolution source before store submission. The current one is upscaled from the 192×208 sprite.

---

## 11. Starter files

| File | What it is | Status |
|---|---|---|
| `components/RequestScreen.tsx` | `'use dom'` screen built with Astryx: theme imports, `Theme`, `Card`, `HStack`/`VStack`, `Heading`, `Text`, `ProgressBar`, `StatusDot`, `Button`, plus the owl | Verified: type-checks, bundles, renders |
| `components/dom/Owl.tsx`, `components/dom/owl/*.ts` | The owl for DOM screens; the 9 states + static as data-URI modules | Verified |
| `components/zukki-theme.css` | Zukki overrides on Neutral (accent, 48/44px controls, light scheme, 1fr/2fr action grid, flex helper) | Verified |
| `app/_layout.tsx` | `SafeAreaProvider` + `Stack` without headers | Verified |
| `app/request/[id].tsx` | Native route: insets, haptics, `router.replace` to the chat, renders the DOM screen | Verified |
| `css.d.ts` | `declare module '*.css'` for TypeScript | Verified |
| `native-tokens.ts` | Colors and sizes for the native tab bar and splash | Reference |
| `types.ts`, `mock.ts` | UI types and demo data | Type-check clean |

Setup notes:
- `package.json`: `"main": "expo-router/entry"`.
- `app.json`: `"scheme": "zukkibiz"` and `"plugins": ["expo-router"]`.

---

## 12. Done when

- [ ] The P0 demo path runs on a real Android phone and an iPhone with no dead ends, using `DEMO_MODE` data that matches the designs.
- [ ] Day-1 risks measured and handled (§3): DOM screen startup from a notification tap, the chat keyboard, and scrolling.
- [ ] Every screen in `design/screens` exists and is reachable through §7.
- [ ] Every control is an Astryx component where §5 lists one. Custom pieces are only the ones in the custom table.
- [ ] No Badge or Card color variants, no Banner, no gradients, no hex colors in screens. Overrides live only in `zukki-theme.css`.
- [ ] Body text ≥ 16px, primary buttons 48px, hit areas ≥ 44px. Works at 130% system font size and on a 360×740 screen.
- [ ] Reduced motion shows the static owl and removes the shake.
- [ ] The countdown expires correctly (test with a 20-second offer) on both the list and the detail screen.
- [ ] Option A and option B both work, and the metadata under the bubble matches what was sent.
- [ ] Test Zukki answers only from the signed-in business's data and never sends anything to a customer.
- [ ] `tsc` passes (with the larger stack, §2) and the demo path logs no console warnings.
