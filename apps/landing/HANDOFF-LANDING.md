# Zukki landing page — handoff

> **Revision 2 (Oct 28).** Marketing Studio was redefined. It is no longer "Zukki generates promotional posts". It is "Zukki organizes the real proof from each job": recovery stories, authentic customer reviews, before-and-after photos and tools-in-action videos, all approved by the owner. If you built from revision 1, see **§0** for exactly what to change.

## 0. What changed since revision 1

Only the Marketing Studio section changed. The Hero, How it works, Closing, tokens and the other two scenes are the same.

| File | Change |
|---|---|
| `src/components/MarketingStudio.astro` | **Replace the whole file.** New H2, new list, new note, four new stage screens and a fixed Approve bar under the stage. |
| `src/styles/motion.css` | **Remove** `zkType`, `zkCaret`, `zkPop`. **Add** `zkT1`–`zkT4`, `zkWipe`, `zkScrub`. `zkS1`–`zkS4`, `zkP1`–`zkP4` and `zkL1`–`zkL4` stay as they were. |
| `design/` | New screenshots of the four studio states; canvas source updated. |

| | Revision 1 | Revision 2 |
|---|---|---|
| H2 | "Zukki drafts. You approve." | "Your real jobs become your best proof." |
| List (left) | 1 Draft · 2 Edit · 3 Approve · 4 Publish | Recovery stories · Customer reviews · Before and after · Tools in action |
| Note | "Zukki asks to publish only when you link your Page and Instagram. Unlink anytime." | "Zukki organizes what really happened on each job. Reviews stay in your customer's words, and nothing is posted until you approve it." |
| Stage states | Draft → caption typing → approved check → published to FB + IG | Recovery story timeline → customer review → before/after wipe → tools clip |
| Approval | its own state (3rd screen) | a fixed bar under every state: "Facebook Page · Instagram" + **Approve** |
| Screen height | 420 px | 372 px (plus the 52 px Approve bar) |

## 1. What this is

A one-page, **informational** landing for Zukki, the AI agent that brings WhatsApp customers to local businesses.

- **No sign-up, no Facebook Login, no forms.** The only links are anchors inside the page.
- **Language:** English.
- **Source of truth:** design **v3 · less text, motion** on the Zukki Landing canvas. v1 (dark) and v2 (light, more copy) are kept on the canvas as alternatives and are not part of this build.
- **`apps/landing/`** is that design already built in Astro. It compiles, and it was checked at 1440 px and 390 px with no horizontal scroll.

```
apps/landing/
├── HANDOFF-LANDING.md        ← this file
├── README.md
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── design/
│   └── screenshots/
│       ├── desktop-hero-early.png
│       ├── desktop-hero-late.png
│       ├── phone-full.png
│       ├── studio-1-recovery-story.png
│       ├── studio-2-customer-review.png
│       ├── studio-3-before-after.png
│       └── studio-4-tools-in-action.png
├── public/owl/               owl poses (animated WebP, 192×208) + avatar
└── src/
    ├── pages/index.astro
    ├── layouts/Base.astro          fonts, meta, in-view script
    ├── components/Hero.astro       nav + headline + hero scene
    ├── components/HowItWorks.astro route scene
    ├── components/MarketingStudio.astro studio scene
    ├── components/Closing.astro    closing panel + footer
    ├── styles/tokens.css           every color, radius, shadow, font size
    ├── styles/motion.css           every @keyframes, with the timeline in comments
    ├── styles/global.css           base, buttons, panel, h2
    └── scripts/inview.ts           plays a scene only while it is on screen
```

## 2. Run it

Needs Node 22 or newer.

```bash
# From repository root:
pnpm dev:landing      # http://localhost:4321
pnpm build:landing    # static site in apps/landing/dist/

# Or from apps/landing:
cd apps/landing
pnpm install
pnpm dev
pnpm build
```

## 3. Stack

| Piece | Choice | Why |
|---|---|---|
| Framework | **Astro 7**, static output, TypeScript | Informational page. Ships plain HTML, and the only JS is the ~20-line in-view script. |
| Styles | Plain CSS with tokens (`tokens.css`), scoped `<style>` per component | Same values as the owner app (Astryx neutral, accent `#0074e2`). The motion is all `@keyframes`, which stays cleaner in plain CSS. |
| Motion | CSS `@keyframes` + `IntersectionObserver` | No animation library needed. Add Motion (motion.dev) only if you later want scroll-triggered entrances. |
| Fonts | Inter (variable) + Inter Tight 600/700 via Fontsource | Self-hosted, no Google Fonts request. |
| Hosting | Vercel or Netlify (static) | Free tier, a preview URL per PR so the team in Taipei, Nairobi and India can review. GitHub Pages also works. |

Astryx components are **not** needed for this page. If you want them later, add `@astrojs/react` and mount them as React islands. Keep the token values the same.

## 4. Page structure

| # | Section | id | Content | Motion |
|---|---|---|---|---|
| 1 | Hero (grey panel) | `top` | Nav: logo + "How it works", "Marketing Studio". H1 "Zukki finds the customer. You do the job." One line of copy. Buttons "See it work" (→ `#how`, blue) and "Marketing Studio" (→ `#studio`, white). | **Hero scene**, 12 s loop |
| 2 | How it works (white) | `how` | H2 "Three stops. One chat." Three stops: "They send a video", "Zukki picks you", "You accept and quote". Note: "No app for the customer. No bidding. One business at a time." | **Route scene**, 6 s loop |
| 3 | Marketing Studio (grey panel) | `studio` | H2 "Your real jobs become your best proof." List: Recovery stories, Customer reviews, Before and after, Tools in action. Note: "Zukki organizes what really happened on each job. Reviews stay in your customer's words, and nothing is posted until you approve it." | **Studio scene**, 16 s loop |
| 4 | Closing (dark panel) | — | Jumping owl. H2 "Zukki brings the request. You have the final word." "Back to top" button. Footer: "Zukki" · "Made for the Meta Global AI Developer Hackathon 2026". | none |

All copy is final as written in the components. Keep it short: the point of v3 is that the animations carry the explanation.

## 5. Tokens (from `tokens.css`)

| Token | Value | Use |
|---|---|---|
| `--zk-bg` | `#ffffff` | page |
| `--zk-panel` | `#f1f1f1` | rounded section panels, chat background |
| `--zk-night` | `#0e1116` | closing panel |
| `--zk-ink` | `#15171c` | video thumbnails |
| `--zk-text` / `--zk-text-2` / `--zk-text-3` | `#000` / `#474747` / `#6a6a6a` | headings / body / inactive step labels |
| `--zk-accent` | `#0074e2` | primary button, Accept, progress dot, "Connect me" |
| `--zk-border-strong` | `#d4d4d4` | route line, image placeholders |
| `--zk-track` | `#e6e6e6` | progress segments, text skeletons |
| Radius | 10 / 12 / 20 / 24 / 28 px | element / button / card / large card / panel |
| H1 / H2 | `clamp(46px, 6.4vw, 88px)` / `clamp(34px, 4.6vw, 60px)` | Inter Tight 600, tight tracking |
| Gutter | `clamp(20px, 4vw, 56px)` | horizontal padding inside panels; page padding 16 px |

## 6. Motion spec

Each scene is an element with `data-scene`. The percentages are positions on that scene's own loop. Exact keyframes are in `motion.css`.

**Hero scene (12 s).** Container max 520 × 570 px. Chat card `left 0 / top 176`, request card `right 0 / top 300`, owl starts at `left 10% / top 43`.

| Time | What happens |
|---|---|
| 3–7% | Customer video bubble rises in |
| 15–19% | "Leak! Help?" |
| 29–33% | Zukki: "Close the valve first. Finding a plumber…" |
| 43–47% | Suggestion card "Northside Plumbing · open now / Connect me" |
| 0–44% | Zukki perched on the chat, **waving** pose |
| 44–58% | Zukki flies in an arc to the request card, swapping to the **running-right** pose |
| 52–58% | Request card slides in from the right |
| 58–88% | Zukki sits on the request card (waving). Accept-window bar shrinks to 18%. |
| 72–86% | Accept button presses and rings |
| 88–98% | Everything fades; Zukki resets to the chat |

**Route scene (6 s).** A dot travels the line: at the customer 6–12%, at Zukki 40–56%, at the business 84–94%. Each stop glows with an accent ring as the dot arrives.

**Studio scene (16 s, four 4 s states).** The stage (max 360 px wide) has a 372 px screen area that shows one state at a time, fading up in and up out. Under it sits a fixed approval bar with "Facebook Page · Instagram" and a blue **Approve** button.

1. **Recovery story** (0–25%), header "from the chat". A timeline built from the WhatsApp conversation, its rows sliding in one by one at 2–17%:
   - 12:04 AM Leak reported
   - 12:06 AM Water shut off
   - 12:40 AM Mario arrives
   - 7:00 AM Fixed (accent dot)

   Below it: "Midnight leak, fixed by 7 AM."
2. **Customer review** (25–50%), header "asked after the job". Five stars, the quote "He got here in 30 minutes and explained everything." and "Ana · customer, shared with her permission".
3. **Before and after** (50–75%), header "photos from the job". The "After" layer wipes across to 55% at 53–63%, with a white divider. "Before" is labelled on the right, "After" on the left. Hint: "[Real photos from the job, with the customer's consent]".
4. **Tools in action** (75–100%), header "clip from your phone". A dark video card titled "Drain camera inspection · 0:15", with its playback bar running at 77–98%. Hint: "Zukki trims it and adds the caption."

Four story-style progress segments fill in sync, and the list on the left turns black for the active kind of content.

**Rules**

- A scene plays only while at least 25% of it is on screen (`inview.ts`). Without JS, scenes just play.
- `prefers-reduced-motion: reduce` removes every animation. Each scene then shows a readable final state: the full chat, the owl on the chat, the request card, and the "Tools in action" state in the studio.
- Animate only `transform`, `opacity` and colors, plus `left/top` on the owl and `width` on the before/after wipe. Don't add layout-shifting animations.

## 7. Rules

- **No sign-up or login.** Don't add "Continue with Facebook", forms, or app-store buttons.
- **No brand logos.** WhatsApp, Facebook and Instagram appear as text labels only. Never draw their logos.
- **No "AI slop":**
  - no chips or badges with pastel backgrounds;
  - no colored stripes or frames on cards;
  - no gradient washes;
  - no emoji.
  Cards are flat white or `#f1f1f1` with soft shadows.
- **Demo data is fictional and stays so:** Northside Plumbing, Mario, Ana, the leaking toilet, "Fixed by 7 AM". Ana's quote is a sample for the demo, not a real review.
- **Authentic content only.** This is the core promise of Marketing Studio, so the page must not contradict it:
  - Zukki **requests, collects and formats** reviews. It never writes, rewrites or "improves" what a customer said, and the copy must not suggest it does. The FTC's 2024 rule bans fake and AI-generated reviews.
  - Photos and videos come from the actual job, used with the customer's consent.
  - Nothing is published without the owner's approval. That is why the Approve bar is always visible.
- **Accessibility:**
  - Each scene is one `role="img"` with an `aria-label` that tells the story. Its inner parts are `aria-hidden`.
  - Real `<a>` for every link, a visible focus ring, and touch targets of at least 44 px.
  - Body text is `#474747` or darker on white and on `#f1f1f1`, which passes 4.5:1.

## 8. Responsive

- **Panels:** flex rows that wrap. Copy and visual stack under about 950 px.
- **Hero scene:** keeps its 570 px height on phones. Cards scale with `min(300px, 78%)` and `min(250px, 64%)`, and the owl's landing point is `calc(100% - 150px)`, so it always lands on the request card.
- **Route:** stays horizontal on phones, with 96 px stops and 15 px labels below 520 px.
- **Checked:** no horizontal scroll at 1440 px or 390 px (see `design/screenshots/`).

## 9. Assets

| File | Size | Where |
|---|---|---|
| `owl/waving.webp` | 192×208, animated | hero (perched) |
| `owl/running-right.webp` | 192×208, animated | hero (flying) |
| `owl/review.webp` | 192×208, animated | spare (no longer used in the studio) |
| `owl/jumping.webp` | 192×208, animated | closing |
| `owl/waiting.webp`, `owl/static.png` | 192×208 | spare poses, not used yet |
| `owl/avatar.png` | 192×192 | logo, chat avatar, route stop, favicon |

The WebPs come from the 192×208 atlas, so **don't show any owl wider than about 200 px**. For a bigger hero owl, export the poses at higher resolution from the artist's original (1024×1024), or render a loop video in Remotion. Video with transparency needs both WebM (Chrome) and HEVC with alpha (Safari).

## 10. Done when

- [ ] `pnpm build:landing` (or `pnpm build`) passes and the site is deployed with a preview URL.
- [ ] The three scenes match the timelines above in Chrome, Safari and Firefox.
- [ ] Studio: the timeline rows stagger in, "Before" stays visible during the wipe, and the Approve bar never moves between states.
- [ ] Scenes pause off screen and restart when scrolled back.
- [ ] With "Reduce motion" on, nothing moves and every scene is readable.
- [ ] No horizontal scroll from 360 px to 1920 px.
- [ ] Lighthouse: Performance ≥ 95, Accessibility 100 on mobile.
- [ ] Keyboard: Tab reaches nav, both hero buttons and "Back to top", each with a visible focus ring.

## 11. Open items

1. **Before/after photos and the tools clip:** both are grey or dark placeholders. Replace them with real material from one job, used with the customer's consent. A matching before/after pair at the same framing works best for the wipe.
1b. **Owner app impact:** this redefinition also changes Marketing Studio inside Zukki for Business. It needs a review request after each job, photo/clip upload per job, and a story built from the chat. That is out of scope for the landing, but the team should align the app with it.
2. **Hi-res owl:** only needed if the owl gets bigger than about 200 px (see §9).
3. **Domain and OG image:** pick the domain, and add a 1200×630 share image to `Base.astro`.
4. **Footer credits:** add team names if you want them on the page.
