# Zukki — System Design

Companion to [HANDOFF.md](HANDOFF.md). The handoff owns the product story;
this file owns the engineering map: components, runtime flows, data, and
where each non-negotiable principle is enforced in code.

## 0. Start here

New to the codebase? Read in this order:

1. [HANDOFF.md](HANDOFF.md) sections 1–4 for the story and screens.
2. Sections 2–3 below for the runtime map.
3. Code entry points: `createApp` in `apps/api/src/index.ts`,
   `transitionJob` in `packages/shared/src/job-states.ts`,
   `groupJobsByTab` in `apps/owner/lib/tonight.ts`.

Visual reference: `design/png/` (10 screens in flow order) and
`design/screens/` (the same screens as static HTML). This doc uses ASCII
diagrams on purpose — no generated images.

## 1. Context

An AI agent for small local-service businesses (plumbers first). A customer
messages one specific business on WhatsApp (video + voice note). The agent
triages with safety questions, draws the valve overlay on a real frame, and
drafts a quote from the owner's price rules. The owner confirms, the customer
approves, the technician goes. The next morning the job photos become an ad.

Not a marketplace: no bidding, no cross-business directory. The map shows
only the business's own jobs and technicians.

## 2. Components

```text
WhatsApp Cloud API ──webhook──▶ apps/api (Node + Hono) ──▶ worker/process-message.ts
                                   │                              ├─ download media → Supabase Storage
                                   │                              ├─ Voice Transcribe (transcript)
                                   │                              ├─ SAM 3.1 (valve box, puddle signal)
                                   │                              └─ Muse Spark agent (tools, ticket JSON)
                                   ▼
                              Supabase (Postgres + Storage + Realtime)
                                   ▲
                    apps/owner (Expo / React Native + Expo web) ◀── realtime, push
```

| Component | Responsibility | Does not do |
|---|---|---|
| `apps/api/src/routes/*` | HTTP only: validate, answer 200, delegate | No business rules, no model calls |
| `apps/api/src/store.ts` (→ Postgres next) | Job + event persistence | No transition logic |
| `packages/shared` | State machine, zod schemas, types | No I/O, no framework imports |
| `apps/api/src/agent/*` | Prompts, summaries, tool contracts | Never writes `jobs.state` directly |
| `packages/meta-models` | One client per Meta model | No prompt logic |
| `packages/whatsapp` | Send text / interactive / location | No triage logic |
| `apps/owner` | Owner decisions: confirm, map, quote, ad | No state transitions except via API |
| `supabase/` | Source of truth for jobs, events, consents | No enforcement (code owns it) |

Dependency direction: routes → store + shared; agent → tools + shared;
owner → API over HTTP only. `packages/shared` is imported by everyone and
imports nothing but zod.

## 3. Runtime flows

### 3.1 Inbound request (screens 02 → 03 → 04)

```text
Customer video+voice → WhatsApp webhook → POST /webhooks/whatsapp → 200 now
  → worker: downloadMedia → transcribeVoice → segmentFrame (SAM valve box)
  → runCustomerAgent (Spark: transcript + frame + price rules)
  → ticket JSON + quote draft → job_events row (actor agent, type triage)
  → push to owner inbox (screen 04, Needs you tab)
```

The webhook never waits for models: WhatsApp retries slow webhooks, and
video plus several model calls takes seconds.

### 3.2 Double confirmation (screens 04 → 05 → 06)

```text
Owner reviews quote (screen 05) → POST /jobs/:id/propose
  {to: owner_confirmed, actor: owner} → transitionJob validates → 200
  → WhatsApp interactive "Visit request" → customer taps Approve
  → POST /jobs/:id/propose {to: customer_approved, actor: customer} → 200
  → job en_route → map (07) → tracking (08) → on_site → done → review (09)
```

`transitionJob` rejects anything else: the agent proposing
`owner_confirmed` gets 409, the owner approving for the customer gets 409,
skipping `proposed → customer_approved` gets 409. Every attempt lands in
`job_events` either way.

### 3.3 Ad studio (screen 10, Could scope)

```text
Review form (Flow or web fallback) → consents row (photos_for_ads, granted)
  → GET /studio/ads reads consents → Muse Image edits before/after photos
  → owner previews, publishes to Page / Marketplace / Instagram
```

Without an explicit granted consent, `/studio/ads` returns `[]`.

## 4. Data

Tables in `supabase/migrations/0001_init.sql`: `businesses`,
`price_rules`, `technicians`, `customers`, `jobs`, `job_evidence`,
`job_events`, `messages`, `consents`.

Key invariants (enforced in code, not just SQL):

- `customers.exact_address` stays null until `customer_approved`. The public
  projection exposes only distance before that.
- `quote` always carries `{lines, total_min, total_max, excludes}` with
  totals equal to the line sums (see `quoteSchema`). No exact final price
  exists before `on_site`.
- `job_evidence.signals` carries `{water_spreading: boolean}` — a signal,
  never a measured area.
- `job_events` is append-only and is the audit log for every demo claim.

## 5. Job state machine

```text
requested → triaged → proposed → owner_confirmed → customer_approved
→ en_route → on_site → done
       └────────→ declined / cancelled (any state before on_site)
```

Locks: `proposed → owner_confirmed` requires `actor: owner`;
`owner_confirmed → customer_approved` requires `actor: customer`. Early
triage moves require the agent side; dispatch moves (`en_route`, `on_site`,
`done`) require the owner side. Terminal states accept nothing. Implemented
in `packages/shared/src/job-states.ts`, covered by 5 tests.

## 6. Meta Model API mapping

| Model | Used for | Wires to |
|---|---|---|
| Muse Spark 1.3 (vision, video, tools, structured output) | Triage, safety questions, diagnosis, ticket JSON, quote draft, owner follow-ups | `agent/*`, `agent/tools.ts`, `worker/runCustomerAgent` |
| SAM 3.1 (text-prompted masks/boxes, tracking) | `shut-off valve` / `fill valve` boxes, `water puddle` signal | `worker/segmentFrame`; overlay drawn by our own code on the real frame |
| Muse Voice Transcribe (streaming + batch STT) | Customer voice note, owner hands-free / hold-to-talk | `worker/transcribeVoice`, `routes/voice.ts` |
| Muse Image (generate + edit) | Ad image from before/after job photos only | `routes/studio.ts` (screen 10) |

Hard limits honored: no video generation, no TTS (agent replies in text),
transcribe before reasoning about audio, safety overlays never use generated
images. Confirm exact model IDs and endpoints in the official docs before
wiring each client.

## 7. Principle enforcement map

| Principle | Enforced in |
|---|---|
| Human approves every job | `transitionJob` actor locks + `POST /propose` mapping to 409 |
| AI disclosure first | `AI_DISCLOSURE` in `customer-agent.ts`, first message template |
| Location privacy | `exact_address` null until approval; public projection shows distance |
| Photo consent | `consents` table gates `/studio/ads` |
| Quotes are ranges | `quoteSchema` (min/max only, totals = sums) |
| Safety first | `nextSafetyQuestion` blocks triage until water + cables answered |
| No generated safety images | Overlay drawn on real frames; Muse Image only in studio |
| Signal, not measurement | `signals.water_spreading: boolean` |

## 8. Doc-to-test trace

Each enforcement claim above has a maintained test:

| Claim | Test |
|---|---|
| Actor locks on both confirmations | `packages/shared/test/job-states.test.ts` |
| Quote totals match lines, demo numbers | `packages/shared/test/schemas.test.ts` |
| 409 on agent self-confirm, 400 on bad body | `apps/api/test/jobs.test.ts` |
| Inbox tabs group states correctly | `apps/owner/lib/tonight.test.ts` |

Run `npm test` (15 tests) and `npm run typecheck`.

## 9. Open decisions

- Demo channel: Cloud API test number vs Messenger fallback.
- Product name: Sealing on Zukki; candidates Sealed, Pickup, Relay.
- WhatsApp Flow (screen 09) vs CTA-URL web form fallback.
- Live location (screen 08): periodic static updates vs tracking-page link.
- Partner network referral share (pitch only): 10%?
