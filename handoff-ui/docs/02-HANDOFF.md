# Handoff: Zukki

Context for a coding agent joining the project. Read this whole file before writing code.

Visual references:
- `design/png/` has the current screens (v4, Zukki) in flow order.
- `architecture/` has the eight architecture diagrams.

---

## 1. What we are building

**One line:** Zukki is an AI assistant on WhatsApp that finds a local business that is open and nearby, in any category, and connects you with it. The demo story is an urgent home repair.
- It understands photos, video, voice and text.
- It helps the customer stop the damage.
- It picks one nearby business that is available now, and hands the conversation to that business's owner, who answers from our app.

**Event:** Meta Global AI Developer Hackathon, Oct 26 – Nov 4, 2026. A distributed team (Taipei, Nairobi, India, Cancún).
**Judging:** Impact 30% · Use of Meta tooling 25% · Demo 25% · Technical 20%.
**Hard requirement:** use the Meta Model API for more than chat completion (vision, voice, image generation).

**Three scenarios:**
1. **Zukki finds a business (the demo).** The customer writes to Zukki. Zukki finds an available nearby business, the customer asks to connect, the owner gets a notification and accepts, and the owner chats from the Expo app. The customer reads the owner's messages in the same Zukki chat.
2. **Multitenant.** Every business is a tenant with its own profile, prices, extra fees, hours, service area and website. All tenants share Zukki's WhatsApp number. Each owner sees only their own conversations.
3. **Marketing content.** The owner links their Facebook Page and Instagram. Zukki drafts posts (text + image), the owner reviews them in the app, and only approved posts are published.

**Demo story:**
- At 12:04 AM, Ana's toilet won't stop running and water is reaching the hallway. She sends Zukki a 14-second video and a voice note.
- Zukki shows her which valve to close, then suggests Northside Plumbing: open now, 1.2 km away, taking night jobs.
- She taps Connect me. The owner gets a push notification with the evidence and accepts within the 5-minute window.
- The owner chats with Ana from the app. Mario arrives and fixes the leak.
- The next morning, Zukki drafts a before/after post, and the owner approves it.

**Positioning:** Zukki is a directory with an assistant on top, not an auction. It picks **one** business instead of letting several pros bid on price, as PRO360 or Thumbtack do.

---

## 2. Product rules (enforce in code)

1. **Disclose the AI.** The first message in every chat says that Zukki is an AI assistant and a person confirms every job.
2. **One business at a time.** Zukki picks one: the closest business that is open now, takes this category and serves this area. The customer can ask for "another option".
3. **The customer asks before any handoff.** Zukki shows the business card first; it hands off only after the customer taps **Connect me**.
4. **The owner must accept.** The time to accept depends on urgency: **5 minutes for urgent requests, 30 minutes for the rest** (defaults, configurable per platform). If the owner doesn't answer, or declines, Zukki offers the request to the next business and tells the customer.
5. **Owner messages go out in the business's name, only as the owner chose them.**
   - *Option A:* the text exactly as written, under a bold "Northside Plumbing · Mario" line (plain text message).
   - *Option B:* with "Polish with Zukki" on, the owner sees their text and Zukki's version side by side and picks which to send. A polished message is sent as an interactive message whose footer reads "Written with Zukki, approved by Northside", with reply buttons Sounds good / Ask a question (§7).
6. **Zukki stays quiet while the owner chats.** It suggests replies and quotes to the owner only. The customer can type "Zukki" at any time to talk to the assistant again; the business chat stays open.
7. **Location privacy.** Businesses see only an approximate area until the customer approves a visit.
8. **Tenant isolation.** A business never sees another business's customers, chats, accounts or drafts. The directory reads public fields only.
9. **Nothing is posted without the owner's approval.** Job photos are used only with the customer's consent.
10. **Safety images are never generated.** The valve arrow is drawn by our code on a real video frame, at SAM's coordinates. Muse Image is used only for marketing images.
11. **Signals are not measurements.** "Water spreading" (SAM tracking on a handheld video) is used for sorting, never shown as a number.

---

## 3. Scope (9 days)

| Priority | Scope |
|---|---|
| **Must (demo)** | Scenario 1 end to end: WhatsApp request (video + voice) → safety reply with marked frame → directory match → business card → Connect me → push + accept within grace → owner chat in the app (option A) → customer receives it in WhatsApp |
| **Should** | Option B (polish); timeout → next business; "another option"; business profile screen (multitenant data) |
| **Could** | Content review → publish an organic post to the team's own test Page |
| **Pitch only** | Technician map and tracking, receipts and reviews, partner referrals. **Paid ads are out of scope.** |

---

## 4. Screens (v4, `design/png/`)

| File | Who | Purpose | Key actions |
|---|---|---|---|
| `ZkWaStart` | Customer · WhatsApp | First contact without media: "Hi" → AI disclosure → list message "What are you looking for?" | See options |
| `ZkWaStartList` | Customer · WhatsApp | The list sheet WhatsApp opens: Home, Everyday and Other categories (8 options) | Plumbing → request |
| `ZkWaRequest` | Customer · WhatsApp | Video + voice note from the customer; Zukki's first text discloses it's an AI; then an interactive message with the marked valve frame and a safety question | Done, no cables / I can't find it |
| `ZkWaLocation` | Customer · WhatsApp | After "Done, no cables": location request message ("The business only sees the exact address after you approve a visit") | Send location |
| `ZkWaMatch` | Customer · WhatsApp | Interactive message suggesting Northside: rating, distance, visit $45, night fee +$25, leak repair from $60, arrives in ~40 min, plus the reason it was chosen | **Connect me** / Show another option |
| `ZkHandoff` | Owner · app | New request from Zukki: "Accept within 4:32" countdown, urgency, approximate distance, marked frame, transcript, Zukki's summary and suggested quote $130–160 | Decline / **Accept and chat** |
| `ZkWaTimeout` | Customer · WhatsApp | Northside didn't answer within 5 min; Zukki offers Eastside | Connect me / Show another option |
| `ZkOwnerChatA` | Owner · app | Chat with Ana via Zukki; Zukki summary card; message sent as written; "Polish with Zukki" off | Send |
| `ZkWaChatA` | Customer · WhatsApp | Receives "Northside Plumbing · Mario: ok mario there 12:55…" | — |
| `ZkOwnerChatB` | Owner · app | Polish on: "You wrote" and "Zukki's version" side by side | Send mine / **Send Zukki's** |
| `ZkWaChatB` | Customer · WhatsApp | Receives the clear version as an interactive message: footer "Written with Zukki, approved by Northside" | Sounds good / Ask a question |
| `ZkBusiness` | Owner · app | Tenant profile Zukki uses: profile, prices, extra fees, hours, service area (map), website import | Edit each section |
| `ZkAccounts` | Owner · app | Linked accounts: Facebook Page, Instagram professional account; what Zukki can and cannot do | See today's drafts |
| `ZkContent` | Owner · app | Review a post: preview (before/after image), caption, platforms, time | Regenerate / **Approve and post** |
| `OwTestZukki` | Owner · app | **Test Zukki:** the owner asks like a customer; Zukki answers from that business's profile, prices and hours, cites which data it used, and says when something isn't offered | Edit prices / Add a service |

Owner app tabs: **Requests · Chats · Jobs · Content · Business.**

Demo numbers (keep consistent):
- Request at 12:04 AM; handoff at 12:05 AM; accepted with 4:32 left.
- Visit $45 + night fee $25 + repair $60–90 = **$130–160**. Arrival 12:55 AM.
- Northside: 4.9 (128 reviews), 1.2 km. Eastside: 4.8 (96), 2.4 km, night fee +$30.
- Customer Ana L.; technician Mario R.

---

## 5. Meta Model API

Base URL `https://api.meta.ai/v1`. **Confirm the exact model IDs, endpoints and limits in the official docs before coding.**

The orchestrator routes each incoming message by type:

| Input | Route | Model(s) |
|---|---|---|
| Voice note | transcribe the whole file → text | Muse Voice Transcribe |
| Video | sample key frames → segment and track → reason | SAM 3.1 + Muse Spark 1.3 |
| Photo | segment if useful → reason | SAM 3.1 + Muse Spark 1.3 |
| Text / button tap | reason, call tools | Muse Spark 1.3 |
| Owner hold-to-talk | realtime transcription | Muse Voice Transcribe |
| Owner message with polish on | rewrite (draft only) | Muse Spark 1.3 |
| Marketing post | caption + image from consented photos | Muse Spark 1.3 + Muse Image |

Known limits (re-check):
- No video generation.
- No text-to-speech, so every reply is text.
- No Swahili in Voice Transcribe.
- Muse Spark's audio support is weak, so always transcribe first.

---

## 6. Architecture

```
Customer ⇄ WhatsApp Cloud API (one number: Zukki) ⇄ Zukki orchestrator ──▶ Meta Model API
                                                         │  match / relay
                                                         ▼
                                   Platform API: directory · handoff + timer · owner chat relay + polish · push · content studio
                                         │                    │                         │
                                   Supabase (Postgres RLS,     Owner app (Expo)          Graph API → Page + Instagram
                                   Storage, Realtime)
```

- **The orchestrator is the only WhatsApp client.** It receives the webhook (answer `200` at once and process async), routes by input type, calls models, and sends every WhatsApp message, including relayed owner messages.
- **The orchestrator never reads the database directly.** It asks the Platform API, which resolves the tenant: `conversation → active handoff → tenant_id`. Never from the message text.
- **Platform API modules:**
  - directory + matching;
  - handoff with the grace timer (a scheduled job that expires the offer);
  - owner chat relay + polish;
  - Expo push notifications;
  - content studio.
- **Supabase:**
  - Postgres with **row-level security on `tenant_id`**;
  - Storage for media;
  - Realtime for the owner chat and request list.
- **Owner app:** Expo (push, microphone, maps; Expo web for a judge-friendly link).

### Monorepo

```
apps/owner           Expo app: requests, chats, jobs, content, business
apps/api             Hono: routes/whatsapp.ts (webhook), routes/handoffs.ts, routes/chats.ts, routes/content.ts, routes/tenants.ts
                     orchestrator/{router.ts, zukki-agent.ts, tools/*}
                     platform/{directory.ts, handoff-timer.ts, relay.ts, polish.ts, push.ts, content-studio.ts}
packages/shared      states.ts (handoff + job), zod schemas, types
packages/meta-models client.ts, muse-spark.ts, sam.ts, voice.ts, muse-image.ts
supabase/            migrations (with RLS policies), seed.sql (Northside, Eastside, Lagoon, Ana)
demo/                toilet-leak.mp4, recorded-responses/ (real model outputs, fallback only)
```

### Handoff states (`packages/shared/states.ts`)

```
with_zukki → matched → offered ──(owner accepts in 5 min if urgent, 30 min otherwise)──▶ accepted → chatting
                 ▲  ▲       │
                 │  └───────┘ no answer / declined → next business
                 └── customer asks for "another option"
chatting ⇢ customer types "Zukki" → Zukki answers, the business chat stays open
```
From `chatting`, a job follows the job states: `quoted → owner_confirmed → customer_approved → en_route → on_site → done` (plus `cancelled` / `declined`).
- The model may only propose transitions.
- Code validates both the transition and the actor.
- Every change goes to `handoff_events` or `job_events`.

### Data model (minimum, every tenant table has `tenant_id` + RLS)

- `tenants`: id, name, category, logo_url, website, rating, accepts_now (bool), night_jobs (bool)
- `tenant_users`: tenant_id, user_id, role (`owner`; more roles later)
- `price_rules`: tenant_id, item, kind (`visit` | `repair_range` | `extra_fee`), min, max, conditions (e.g. "10 PM–7 AM")
- `hours`: tenant_id, weekday, opens, closes
- `service_areas`: tenant_id, center (point), radius_km
- `customers`: id, wa_id, display_name, approx_location, exact_address (hidden until approval)
- `conversations`: id, customer_id, state (handoff state), active_handoff_id
- `handoffs`: id, conversation_id, tenant_id, offered_at, expires_at, accepted_at, declined_at, attempt
- `messages`: id, conversation_id, tenant_id (null while with Zukki), sender (`customer` | `zukki` | `owner`), body, polished (bool), media_id, wa_message_id, at
- `media`: id, conversation_id, kind, storage_path, transcript, sam_detections (JSON), signals (JSON)
- `jobs`, `job_events`: as before, scoped by tenant_id
- `linked_accounts`: tenant_id, platform (`facebook_page` | `instagram`), external_id, token_ref, mode (`live` | `test`)
- `content_drafts`: tenant_id, source_media_ids, caption, image_path, platforms, scheduled_at, status (`draft` | `approved` | `published` | `rejected`)
- `consents`: conversation_id, kind (`photos_for_marketing`), granted, at

### Zukki tools (Muse Spark function calling)

- **Read:** `search_directory(category, location, now)` · `get_business_profile(tenant_id)` · `get_price_rules(tenant_id)`
- **Write:** `create_handoff(conversation_id, tenant_id)` · `propose_transition(entity, id, to_state, reason)`
- **Talk:** `send_whatsapp_message(conversation_id, template | interactive)` · `suggest_reply_to_owner(conversation_id)` · `polish_owner_message(conversation_id, text)` (returns a draft; it never sends)

The business context given to the model is always scoped to the active tenant.

---

## 7. WhatsApp specifics

- **One number for everyone:** the WhatsApp Cloud API test number for the demo. It can only send to a few registered recipients. Use a system-user token with `whatsapp_business_messaging`, `whatsapp_business_management` and `business_management`.
- **Message types:**
  - **Rule: the customer screens show only what the Cloud API can send.** No custom cards, tables, colored names, logos inside messages or system notices from the business. Every message is one of: text, image/video/audio, or an interactive reply-button message.
  - **Interactive reply-button message** = optional header (text ≤60 chars, or image/video/document) + body (≤1024 chars; `*bold*` and `_italic_` work) + optional footer (≤60 chars, shown small and gray) + 1–3 buttons (≤20 chars each). Used for:
    - the safety reply: header = the marked frame (image drawn by our code), body = the instruction, buttons **Done, no cables** / **I can't find it**;
    - the business suggestion: header "Northside Plumbing", body = rating · distance · open now, then one line per price (`Visit: $45`, `Night fee (10 PM–7 AM): +$25`, `Leak repair: from $60`, `Can arrive: in about 40 min`), footer "Closest plumber taking night jobs right now", buttons **Connect me** / **Show another option**;
    - the next business after a timeout (same format, Eastside);
    - the quote: header "Quote from Northside Plumbing", body = technician and arrival, the price lines, `*Estimated total: $130–160*`, "You pay Mario after the repair.", footer "Nothing is booked until you approve", buttons **Approve visit** / **Ask a question**.
  - **Location request message** (`location_request_message`): body (≤1024 chars) + WhatsApp's own **Send location** button; no header or footer. Zukki sends it after the safety step. The reply is a `location` message with latitude and longitude (name and address only if the customer adds them). The exact location is stored but shown to a business only after the customer approves a visit.
  - **List message** (`list`): optional text header (≤60), body (≤4096), optional footer (≤60), **one** button (≤20) that opens a WhatsApp sheet with up to **10 rows** in up to 10 sections (section title ≤24, row title ≤24, row description ≤72). Used only when a customer writes without a photo, video or clear request: "What are you looking for?" with sections **Home** (Plumbing, Electrical, Locksmith), **Everyday** (Food and drinks, Beauty and care, Car and moto, Pets) and **Other** (Something else). The categories come from the directory taxonomy and can change. Never used to list several businesses: Zukki suggests one.
  - **Typing indicator:** while the models work on a video or voice note, mark the message as read with `typing_indicator: {type: "text"}`. It disappears when Zukki replies or after 25 seconds.
  - **AI disclosure** is Zukki's first text message ("Hi, I'm Zukki, an AI assistant that finds you a local business…"). A business can't create WhatsApp system notices.
  - **No verified badge** in the designs: the test number isn't Meta Verified.
  - **option A (as written):** a text message whose first line is the business name in bold (`*Northside Plumbing · Mario*`). WhatsApp only colors sender names in groups, so bold is the only way to show the sender;
  - **option B (polished):** an **interactive reply-button message**. Body = the bold business line + Zukki's version (max 1024 chars); **footer** = `Written with Zukki, approved by Northside` (WhatsApp shows the footer smaller and gray; max 60 chars); buttons = **Sounds good** / **Ask a question** (a footer requires at least one button; max 3, 20 chars each). A tapped button reaches the owner's chat as the customer's reply.
- **24-hour window:** the customer writes first, so free-form replies are fine.
- **Policy:** since Jan 15, 2026, general-purpose AI chatbots are not allowed on the Business API. Zukki stays on one job, finding and contacting local businesses (search, connect, quote or booking, follow-up), hands every request to a person at the business, and declines unrelated questions (weather, homework, general chat). Covering many categories is fine; becoming an open-ended assistant is not.
- **Live location:** businesses cannot share live location through the API, as far as we know. Use a tracking link if needed (pitch only).

---

## 8. Meta publishing (scenario 3)

- **Organic posts:**
  - Facebook Page posts need `pages_manage_posts`.
  - Instagram needs `instagram_basic` + `instagram_content_publish` and an Instagram **professional** account linked to the Page.
  - In development mode this works with the team's own test Page.
- **Paid ads:** out of scope.
- **Test Zukki** uses the same Zukki prompt and tools as WhatsApp, scoped to the signed-in tenant, but never sends anything to a customer.
- **WhatsApp catalog:** out of scope.

---

## 9. Design system and UI rules

- **Owner app:** Astryx (`github.com/facebook/astryx`), theme `neutral`, font Figtree, accent overridden to Astryx blue-50 `#0074e2`. Tokens are in `design/tokens.json`.
- **Customer screens:** native WhatsApp on Android (Roboto; colors in `tokens.json` → `whatsappNative`).
- **Accessibility (25–50 year-olds):**
  - body text at least 16px;
  - buttons 48px tall; touch targets at least 44px;
  - plain language;
  - one primary button per screen.
- **Avoid "AI slop":**
  - no pastel chips or badges;
  - no colored stripes or tinted frames on cards;
  - no decorative gradients.
  - Show status as text with hierarchy and real switches. Functional photo annotations (SAM marks) are the exception.
- **Assets:** `design/img/` holds `logo-zukki.svg`, `logo-northside.svg`, `logo-eastside.svg`, `avatar-mario.svg`, `bath-leak.svg` (valve at 124,153 in the 400×240 viewBox), `bath-fixed.svg`, `map-city.svg`, `wa-pattern.svg`.

---

## 10. Demo and honesty rules

- Record the demo with the real system working end to end.
- `demo/recorded-responses/` may hold only **real** model outputs from real runs. They are used only with `DEMO_FALLBACK=true`, with a visible "replay" label, and explained in the README.
- Seed data (Northside, Eastside, Lagoon, Ana) lives in `supabase/seed.sql`.

---

## 11. Team and open questions

- **Crystal** (Taipei): lead, story, pitch.
- **Oscar:** business onboarding (profile, prices, website) and content studio.
- **Nairobi and India teammates:** to be assigned.
- **Jorge** (Cancún): design and architecture.

Open:
1. Exact Meta Model API model IDs, formats and rate limits.
2. A real statistic for the impact slide (missed after-hours requests, or the value of night jobs).
3. Matching weights: distance vs rating vs price. Default: open now and in the area first, then distance.
4. Whether Zukki also offers non-urgent requests (scheduled visits) in the demo.
