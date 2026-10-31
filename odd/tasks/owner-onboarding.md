---
status: done
---

# Onboarding: intro to live

Objective: build the first-run flow (`OwWelcome`, `OwIntro2`, `OwIntro3`, `OwSignUp`, `OwVerify`,
`OwProfileSetup`, `OwPricesSetup`, `OwAreaSetup`, `OwLive`) in `apps/owner/features/onboarding`.
Branch `feat/owner-onboarding` (worktree `owl-hours-worktrees/owner-onboarding`), coder: muse
(`muse-spark-1.3-contributor`, effort `xhigh`), test runner `node --test` (the owner `test` script).

## Specs

Copy and layout come from `handoff-ui/owner-app/design/html/{OwWelcome,OwIntro2,OwIntro3,OwSignUp,OwVerify,
OwProfileSetup,OwPricesSetup,OwAreaSetup,OwLive}.dc.html` (source of truth for text); Astryx is the truth for
how each control looks. Copy from the HTML, data verbatim from `apps/owner/shared/data/mock.ts` (`business`,
`owner`); no `shared/` edits. Quotes below are from `handoff-ui/owner-app/HANDOFF-RN-UI.md` §7–8.

- S1 Routes (thin adapters, under `app/onboarding/`, see L2): `(onboarding)/intro.tsx` "OwWelcome, OwIntro2, OwIntro3 (one DOM screen with a
  swipe pager inside)", `(onboarding)/sign-up.tsx`, `(onboarding)/verify.tsx`, `(onboarding)/business.tsx`
  (`OwProfileSetup`), `(onboarding)/prices.tsx` (`OwPricesSetup`), `(onboarding)/area.tsx` (`OwAreaSetup`),
  `(onboarding)/live.tsx` (`OwLive`). Flow: "intro → sign-up → verify → business → prices → area → live →
  requests. "I already have an account" goes to requests. "Continue with Facebook" skips verify."
- S2 Intro: "Each slide: the owl at 1.3, `PagerDots`, a title, a lead paragraph and a button. "Skip" on slides
  1–2. Slide 3 has "Create my account" + "I already have an account"." Copy:
  1. "Hi, I'm Zukki" / "People message me on WhatsApp when they need a local business. I find them one nearby
     that is open, like yours."
  2. "I bring you nearby requests" / "Day or night, I send you jobs in your area with the customer's photos or
     video. Urgent ones wait 5 minutes for you, the rest 30."
  3. "You have the final word" / "I suggest replies, quotes and posts. Nothing reaches a customer or your Page
     until you approve it."
- S3 Sign up (`OwSignUp`): "`ZukkiSays` "Let's set up your account. It takes about 3 minutes."" / "Your name;
  Mobile number ("We'll text you a code to confirm it.")." / "Terms checkbox, then `Divider` "or", then
  "Continue with Facebook"." / ""Send code", disabled until the form is valid."
- S4 Verify (`OwVerify`): "Owl `waiting`, "Enter the code", then `CodeInput`." / ""Resend code in 0:24"
  (becomes a link at 0) and "Change number"." / "Auto-submits on the 6th digit. A wrong code shows "That code
  didn't work. Try again." (`status` error) and shakes the boxes, unless reduced motion is on."
- S5 Setup 1–3: "`ProgressBar` "Step n of 3"." Step 1: "Logo + Change, Business name, Category, Website." /
  "After the website is entered: "Reading your website…" (owl `running`), then "Imported 12 services and 4
  prices" (success text + check)." Step 2: "`ZukkiSays` (`running`): "I found these on your website. Check
  them before customers see them."" / "Price rows with edit, then "Extra fees", then "+ Add a price"."
  Step 3: "Map card + radius `Slider` (1–20 km);" / ""Regular hours" row;" / "`Switch` "Urgent night
  requests · 10 PM–7 AM, with your night fee";" / ""Finish"." / "Map: a static image for the hackathon."
- S6 Live (`OwLive`): "Owl `jumping`, "Northside is live on Zukki", "Zukki can now suggest you for plumbing
  requests within 5 km."" / ""Allow notifications" calls a **native** callback for the OS permission prompt."
  / ""Link accounts" (secondary)."
- S7 Every screen: "Loading: `Skeleton` blocks with no shimmer, or nothing under 300 ms." / "Error: owl
  `failed` + "Something went wrong." + "Try again". Never a raw error message."
- S8 Architecture (`AGENTS.md`): components never import services; routes never call services; hooks are the
  only service consumers, with injected dependencies (fake by default); pure logic in `lib/`; every visible
  string in `copys/`. Expo DOM rules: serializable props, top-level async callbacks, no children. The auth
  gate in `app/_layout.tsx` and the entry redirect in `app/index.tsx` are out of this unit (the operator
  wires them).

## Tasks

- T7.1: onboarding slice, S1–S8, route: delegated to muse (user: "arranca el onboarding con un subagente
  (muse)"), status: done (GREEN, reviewed)

## Log

- L1 (user, 2026-10-29): "mientras, arranca el onboarding con un subagente (muse)".
  - Worktree from `1b9e5fc` (the T6 base), parallel to T6a (agy) and T6b (muse) in their own worktrees.
- L2 (user, 2026-10-29): "SI" (approves the operator's answers to the RED questions).
  - Phone valid with 10–15 digits once spaces, "+" and dashes are removed (E.164 maximum).
  - Demo code `482910` (the HTML shows `4 8 2 9 1 _`); `verifyCode` returns the state `wrong_code`, the screen
    shows the copy.
  - At 0 the resend countdown becomes the link "Resend code".
  - Routes in a real folder `app/onboarding/` (`/onboarding/intro` … `/onboarding/live`, then `/requests`): an
    `(onboarding)` group would resolve `/business` onto the Business tab (Expo Router groups do not change the URL).
  - "Add a price" with the `+` as an icon; the night switch as two strings, "Urgent night requests" and
    "10 PM–7 AM, with your night fee", as the HTML lays them out.
  - RED: 7 files failing on import, existing 172 green. Tests adjusted by the operator, then locked.
- L3 (operator, 2026-10-29): GREEN + one cleaner round.
  - GREEN: muse implemented the nine screens (intro pager, sign up, verify, setup 1–3, live), seven routes under
    `app/onboarding/`, lib, services, hooks and copys; locked-test checksums unchanged.
  - Review (Opus, independent): 7 blockers (price rows without edit, logo "Change" missing, timer in the component,
    hooks reading `mock.ts`, pager label outside copys, missing "." after the phone number, dead "$0" row) and 8
    advisories; one cleaner round fixed all of them.
  - Gates (operator re-run): owner `tsc` clean; `npm test` 5/5; `npm run typecheck` 5/5; `expo export --platform
    android` passes only with `EXPO_NO_BUNDLE_SPLITTING=1` (Expo CLI 58.1.16 defect, D14).
  - Pending: user decision on `EXPO_NO_BUNDLE_SPLITTING=1` in the `build` script; `expo-notifications`; auth gate
    and entry redirect; `useSignUp` still exposes `saveOwnerName`/`sendCode` next to `submit`.
  - Next objective: 4. Push notification + Test Zukki.
