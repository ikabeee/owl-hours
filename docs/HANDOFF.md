# Handoff: Two Agents, One Confirmed Job

Context for a coding agent joining the project. Read this whole file before writing code.
Visual reference: `design/png/` (10 screens, in flow order) and `design/screens/` (the same screens as static HTML).

---

## 1. What we are building

**One line:** an AI agent for small local-service businesses (plumbers first) that takes urgent requests on WhatsApp, helps the customer stop the damage, and prepares the job ticket and quote from the owner's own rules. A person confirms every job.

**Event:** Meta Global AI Developer Hackathon, Oct 26 – Nov 4, 2026. A distributed team (Taipei, Nairobi, India, Cancún).
**Judging:** Impact 30% · Use of Meta tooling 25% · Demo 25% · Technical 20%.
**Hard requirement:** use the Meta Model API for more than chat completion (vision, voice, image generation).

**Demo story:** at 12:04 AM, Ana's toilet won't stop running and water is reaching the hallway. She finds Northside Plumbing on Facebook Marketplace and opens WhatsApp. She sends a 14-second video and a voice note. The agent shows her which valve to close, then builds a quote from Northside's night prices. The owner confirms it, and Ana approves it in WhatsApp. Mario (the technician) arrives and fixes it. The next morning, the job photos become an ad.

**Not a marketplace.** Customers message one specific business, and nobody bids. The map shows only the business's own jobs and technicians. This is what makes it different from PRO360 and Thumbtack.

---

## 2. Users and product principles

- **Customer (homeowner, 25–50).** Stressed, often at night. Uses WhatsApp and will not install an app.
- **Business owner or technician (25–50).** Often driving. Needs to decide fast, often by voice.

Principles. These are non-negotiable and must also be enforced in code:
1. **A human approves every job.** The agent proposes; the owner confirms and the customer approves. No job reaches `customer_approved` without both actions.
2. **Disclose the AI.** The first message in every chat says that an AI assistant answers and a person confirms jobs.
3. **Location privacy.** Before approval, show only an approximate area (distance). The exact address is shared only after the customer approves.
4. **Photo consent.** Job photos are used in ads only when the customer gave explicit consent (a checkbox in the review form).
5. **Quotes are ranges.** Example: "$60–90 estimate, excludes floor damage". The final price is confirmed on site.
6. **Safety first.** Before anything else, ask whether water is still flowing and whether there are outlets or cables near the water.
7. **Safety instructions never use generated images.** The valve arrow is an overlay drawn by our own code on a real video frame, positioned with SAM. Muse Image is used only for marketing images.
8. **"Water spreading" is a signal, not a measurement.** With a handheld video, the area changes as the camera moves, so never show it as an exact number.

---

## 3. Scope (9 days, cut ruthlessly)

| Priority | Scope |
|---|---|
| **Must (the demo)** | WhatsApp request (video + voice) → triage with safety questions → valve overlay → owner inbox → quote from price rules → owner confirms (tap or voice) → customer approves in WhatsApp |
| **Should** | Tonight's map with the technician's position; receipt and review form; photo consent |
| **Could** | Ad studio (Oscar's area): before/after photos → ad image → post to Page |
| **Pitch only** | Marketplace listing integration; partner network (when full, the agent hands the job to a trusted partner, and the referrer earns 10%) |

---

## 4. Screens (v3, in flow order)

| # | File | Who | Purpose | Key actions |
|---|---|---|---|---|
| 01 | `HfMarket` | Customer · Facebook | Marketplace → Home services. Card "Something urgent at home?", categories, businesses open now | Open a business |
| 02 | `HfBusiness` | Customer · Facebook | Business page: rating, reply time, arrival time, prices set by the owner, hours and area | **Message on WhatsApp** (click-to-WhatsApp) |
| 03 | `HfWaChat` | Customer · WhatsApp | AI disclosure notice. Customer sends a video and a voice note (with transcript). Agent replies with a video frame showing the valve circled and a clockwise arrow, plus a safety question | Reply buttons: "Done, no cables" / "I can't find it" |
| 04 | `HfInbox` | Owner · app | "Tonight": the night-jobs switch; tabs Needs you / Assistant / Booked; urgent card with evidence (water spreading, valve closed, no cables) and the agent's summary | Review quote, Call |
| 05 | `HfQuote` | Owner · app | Video frame with SAM marks (fill valve, puddle). Line items, estimated total. Agent question: no fill valve in the van, pick one up on the way? | Yes / No / **hold to answer by voice**; Confirm and send |
| 06 | `HfWaApprove` | Customer · WhatsApp | Interactive message "Visit request" (confirmed by the owner): technician, arrival window, fees, estimated total, the pay-on-site note | **Approve visit** / Ask a question |
| 07 | `HfMap` | Owner · app | Map of tonight: the approved job, other jobs, Mario's position and route, the hands-free button | Share location with the customer |
| 08 | `HfWaTrack` | Customer · WhatsApp | Location card with Mario's route and ETA, plus safety reminders | View location |
| 09 | `HfWaReview` | Customer · WhatsApp Flow | Receipt ($145, within the estimate), before/after photos, rating, photo-consent checkbox | Send review |
| 10 | `HfPromote` | Owner · app | Ad preview made from the job photos (the consent line is shown); placements: Marketplace, Page, Instagram | New version, Publish |

Demo numbers (keep them consistent everywhere):
- Request at 12:04 AM, 14-second video.
- Visit $45 + night fee $25 + repair estimate $60–90 = **$130–160**.
- First arrival window 12:40–1:10 AM. After the pickup detour: **12:55–1:25 AM**. ETA 1:04 AM.
- Repair done at 1:35 AM. Final price $45 + $25 + $75 = **$145**. Fixed in 91 minutes.
- Business: Northside Plumbing, 1.2 km away, rated 4.9 (128 reviews). Technician: Mario R. Customer: Ana L.

---

## 5. Meta Model API: what each model does

Base URL `https://api.meta.ai/v1`. **Confirm the exact model IDs and endpoints in the official docs before coding.**

| Model | Used for | Screens |
|---|---|---|
| **Muse Spark 1.3** (vision, video, tool calling, structured output) | Understands the video and the transcript; asks the safety questions; diagnoses; fills the ticket JSON; drafts the quote from price rules; asks the owner follow-up questions | 03, 04, 05, 06 |
| **SAM 3.1** (text-prompted masks/boxes, video tracking) | Finds "shut-off valve" (for the overlay) and "fill valve"; segments and tracks "water puddle" to produce the urgency signal | 03, 04, 05 |
| **Muse Voice Transcribe** (speech-to-text, realtime over WebSocket) | Transcribes the customer's voice note; owner's hands-free and hold-to-talk replies | 03, 05, 07 |
| **Muse Image** (`muse-image-1.0`, `/v1/images/edits`) | Ad image only, made from the before/after job photos | 10 |

Known limits (from earlier research; re-check):
- No video generation.
- No text-to-speech, so the agent replies in text.
- Voice Transcribe covers about 25 languages and does not include Swahili.
- Muse Spark's audio support is weak, so always transcribe first.

---

## 6. Architecture

```
WhatsApp Cloud API ──webhook──▶ api (Node + Hono) ──▶ queue/worker
                                   │                    ├─ download media
                                   │                    ├─ Voice Transcribe
                                   │                    ├─ SAM (valve, puddle)
                                   │                    └─ Muse Spark agent (tools)
                                   ▼
                              Supabase (Postgres + Storage + Realtime)
                                   ▲
                    owner app (Expo / React Native, also web) ◀── realtime updates, push
```

- **Webhook:** answer `200` immediately, then process asynchronously. WhatsApp retries slow webhooks, and video plus several model calls takes seconds.
- **Media:** a webhook carries only a media ID. Fetch the media URL with the token, download the file, and store it in Supabase Storage.
- **Owner app:** Expo, for push notifications (urgent requests at night), background location (technician on the map) and the microphone. Expo web gives judges a no-install link.
- **Maps:** MapLibre with OpenStreetMap tiles on web; `react-native-maps` on mobile.

### Monorepo

```
apps/owner          Expo app (screens 04, 05, 07, 10 + onboarding)
apps/api            Hono server: routes/whatsapp.ts, routes/jobs.ts, routes/voice.ts, routes/studio.ts
                    worker/process-message.ts, agent/{customer-agent,business-agent}.ts, agent/tools/*
packages/shared     job-states.ts, zod schemas (Ticket, Quote, PriceRules), types
packages/meta-models client.ts, muse-spark.ts, sam.ts, voice.ts, muse-image.ts
supabase/           migrations, seed.sql (Northside, Mario, Ana, the demo request)
demo/               toilet-leak.mp4, recorded-responses/ (real model outputs, fallback only)
```

### Job state machine (enforce it in `packages/shared/job-states.ts`)

```
requested → triaged → proposed → owner_confirmed → customer_approved → en_route → on_site → done
                         └─────────→ declined / cancelled (any state before on_site)
```
- `proposed → owner_confirmed`: only an owner action (tap or voice) can do this.
- `owner_confirmed → customer_approved`: only the customer's WhatsApp button can do this.
- The model proposes transitions; code validates them. The model never writes state directly.

### Data model (minimum)

- `businesses`: id, name, phone_number_id, logo_url, area, night_hours, accepts_night_jobs
- `price_rules`: business_id, item, kind (`callout` | `night_fee` | `repair_range`), min, max, notes
- `technicians`: id, business_id, name, van_stock (JSON), last_location, status
- `customers`: id, wa_id, display_name, approx_location, exact_address (null until approval)
- `jobs`: id, business_id, customer_id, technician_id, state, urgency (`now` | `today` | `week`), category, title, diagnosis, quote (JSON), arrival_window, created_at
- `job_evidence`: job_id, media_id, kind (`video` | `voice` | `photo` | `frame`), transcript, sam_detections (JSON), signals (JSON, e.g. `{water_spreading: true}`)
- `job_events`: job_id, actor (`agent` | `owner` | `customer` | `system`), type, payload, at. This is the audit log.
- `messages`: job_id, direction, wa_message_id, type, body, at
- `consents`: job_id, kind (`photos_for_ads`), granted, at

### Agent tools (Muse Spark function calling)

`get_price_rules(business_id)` · `check_availability(business_id, window)` · `check_van_stock(technician_id, part)` · `create_or_update_ticket(job_id, ticket)` · `propose_transition(job_id, to_state, reason)` · `send_whatsapp_message(job_id, template | interactive)` · `ask_owner(job_id, question, options)`

The ticket is structured output validated with zod. Shape:
`{category, title, urgency, safety: {water_flowing, cables_near_water, valve_closed}, diagnosis, likely_part, quote: {lines: [{label, min, max}], total_min, total_max, excludes}, arrival_window}`.

---

## 7. WhatsApp specifics

- **For the demo, use the Cloud API test number.**
  - It only sends to a few registered recipient numbers.
  - Use a permanent system-user token with the permissions `whatsapp_business_messaging`, `whatsapp_business_management` and `business_management`.
  - The business portfolio needs no business verification.
- **Free-form replies only inside the 24-hour customer-service window.** The customer messages first, so this is fine.
- **Screen 03 and 06 buttons** are interactive reply buttons (up to 3 per message).
- **Screen 09** is a WhatsApp Flow (a form inside WhatsApp). If Flows take too long, fall back to a CTA-URL button that opens a small web form.
- **Screen 08:** the API sends static location messages. As far as we know, businesses cannot share *live* location through the API. Implement it as periodic static location updates or a CTA-URL button to a tracking page, and verify this in the docs.
- **Policy:** since Jan 15, 2026, general-purpose AI chatbots are banned on the WhatsApp Business API. Our bot is allowed because it serves one business's own customers (support, quotes, bookings). Keep the agent on-topic and refuse unrelated questions.

---

## 8. Design system and UI rules

- **Business app and Marketplace screens:** Astryx (`github.com/facebook/astryx`), theme `neutral`, font Figtree. The accent is overridden to Astryx blue-50 `#0074e2`. Tokens are in `design/tokens.json`. In code, prefer `@astryxdesign/core` components with the theme, not hand-rolled styles.
- **Customer screens:** imitate native WhatsApp on Android (Roboto, bubble colors from `tokens.json` → `whatsappNative`).
- **Accessibility (users 25–50):**
  - body text at least 16px;
  - buttons 48px tall; touch targets at least 44px;
  - plain language;
  - one primary button per screen.
- **Avoid "AI slop":**
  - no chips or badges with pastel backgrounds;
  - no colored stripes or tinted frames on cards;
  - no decorative gradients.
  - Show status as text with hierarchy (for example, red text for "Urgent" with a small dot; secondary gray text for "Waiting"). Use real switches, neutral surfaces, and color only where it carries meaning.
  - Annotations on photos (SAM marks) are the exception, because they are functional.
- **Icons:** Lucide-style line icons (Astryx neutral uses Lucide). No emoji in the UI.
- **Assets** in `design/img/` are illustrations, not photos. Replace them with real photos when available.
  - `bath-leak.svg` / `bath-fixed.svg`: the job frames. The shut-off valve is at (124, 153) in the 400×240 viewBox.
  - `map-city.svg`: 390×520. Route in demo coordinates: van at (140,345) → (140,310) → (220,310) → home at (220,236).
  - `avatar-mario.svg`, `logo-northside.svg`, `logo-eastside.svg`, `hero-night.svg`, `wa-pattern.svg`.

---

## 9. Demo and honesty rules

- Record the demo video with the real system working end to end.
- `demo/recorded-responses/` may hold only **real** model outputs saved from real runs. They are used only when `DEMO_FALLBACK=true`, the UI shows a small "replay" label, and the README explains it. Never hand-write fake model outputs.
- Seed data is fine (Northside, Mario, Ana). Make it reproducible with `supabase/seed.sql`.

---

## 10. Team and open questions

- **Crystal** (Taipei): team lead; story, pitch, end-to-end tests.
- **Oscar:** business onboarding (profile, price list, website) and the ad studio.
- **Others** (Nairobi, India) and **Jorge** (Cancún): to be assigned. Suggested split: WhatsApp webhook + media; agent + Meta model clients; owner app.

Open questions:
1. Is the demo channel WhatsApp (test number) or Messenger on a test Page as a fallback?
2. What is the final product name? Candidates: Sealed, Pickup, Relay.
3. Is 10% the right referral share for the partner network (pitch only)?
4. Confirm the exact Meta Model API model IDs, request formats and rate limits.

Earlier explorations (Draft 1, Draft 2 with the partner network, v2) live in the design canvas. v3 is the source of truth.
