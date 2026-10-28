# Zukki API (v1)

Two audiences, two prefixes:

| Prefix | Caller | Auth |
|---|---|---|
| `/v1/owner` | Zukki for Business (owner app) | `Authorization: Bearer <Supabase access token>` from the owner's login. Every query runs as that user, so row-level security keeps each business to its own data. |
| `/v1/internal` | WhatsApp integration (server to server) | `x-zukki-key: <ZUKKI_SERVER_KEY>`. Never put this key in an app. |

The WhatsApp code can also skip HTTP and call the same functions in-process from `apps/api` (`src/services/whatsapp-service.ts`, `src/worker/process-message.ts`).

## Conventions

- JSON in and out, camelCase. Ids are uuids; times are ISO 8601 with an offset; money is whole currency units.
- Success: `{ "success": true, "data": ... }`. Failure: `{ "success": false, "error": { "code", "message" } }`.
- Bodies over 64 KB are rejected. Unknown fields are rejected.
- Rate limits per minute: 600 per IP, 120 per owner. Over the limit: `429` with `Retry-After`.

| Status | `error.code` | When |
|---|---|---|
| 400 | `invalid_body`, `invalid_query`, `invalid_id` | Input failed validation (message says which field) |
| 401 | `unauthorized` | Missing or wrong token or server key |
| 404 | `not_found` | Not found, or not yours |
| 409 | `conflict`, `changed_since_read`, `offer_expired` | Duplicate, changed by someone else, or accepted too late |
| 422 | `invalid_state`, `chat_closed`, `rule_violation` | The current state does not allow it |
| 429 | `rate_limited` | Too many requests |
| 503 | `model_unavailable`, `not_configured` | Model credits or server settings missing |

## Owner app (`/v1/owner`)

| Method and path | Body / query | Returns |
|---|---|---|
| `GET /me` | | `{ userId, businesses: [{ id, name, shortName, category, takingRequests, role, displayName }] }` |
| `GET /offers` | `?status=offered\|accepted\|declined\|expired\|closed&limit=` | Requests: `id, conversationId, status, urgent, title, customerName, approxLocation, distanceKm, zukkiSummary, customerQuote, suggestedQuote {min,max}, media [{kind, url, thumbUrl, durationMs}], offeredAt, expiresAt`. Media links expire after 10 minutes. |
| `POST /offers/:id/accept` | | `{ id, status, expiresAt }`. `409 offer_expired` if the window closed. |
| `POST /offers/:id/decline` | `{ reason: busy\|too_far\|not_offered\|other, note? }` | `{ id, status, declineReason }` |
| `GET /conversations` | `?limit=` | Chats: `id, offerId, title, customerName, chatOpen, job {id, state, arrivalWindow}, lastMessage {from, text, sentAt}, unread` |
| `GET /conversations/:id/messages` | `?before=<sentAt>&limit=` | One page, oldest first: `id, from (customer\|zukki\|owner), kind, text, payload, sentAt, status, delivery (as_written\|polished), media` |
| `POST /conversations/:id/messages` | `{ text }` | Option A, sent as written. `201 { id, sentAt, status: "queued" }`. `422 chat_closed` if not accepted. |
| `POST /conversations/:id/read` | | Clears the unread count |
| `POST /conversations/:id/drafts` | `{ text }` | Option B. `201 { draftId, original, polished, language }`. `polished` is null when the model is unavailable or changed a number. |
| `POST /drafts/:id/send` | `{ usePolished }` | Sends the owner's pick |
| `GET /jobs` | `?limit=` | Jobs: `id, title, state, customerName, technician, arrivalWindow, total, quote {id, status, lines, total, arrivalFrom, arrivalTo}, location (only after the customer approves), shareConsent, timeline` |
| `GET /jobs/:id` | | One job |
| `POST /jobs/:id/quote` | `{ lines: [{label, min, max}], arrivalFrom, arrivalTo, technicianId?, note? }` | `201 { id, total, arrivalFrom, arrivalTo }`. Totals are the sum of the lines; a new quote replaces the open one. |
| `POST /jobs/:id/transition` | `{ to: en_route\|on_site\|done\|declined\|cancelled\|owner_confirmed, reason }` | `{ id, state }` |
| `POST /test-zukki` | `{ question, history?, businessId? }` | `{ businessId, reply }`. Answers only from that business's profile and prices; sends nothing to customers. |

## WhatsApp webhook (`/webhooks/whatsapp`)

Set the Meta app's WhatsApp webhook to `https://<api host>/webhooks/whatsapp`, with the same verify token as `WHATSAPP_VERIFY_TOKEN`, and subscribe to the `messages` field.

| Method | What it does |
|---|---|
| `GET` | Meta's verification: returns `hub.challenge` when `hub.mode=subscribe` and `hub.verify_token` matches, else `403`. |
| `POST` | Checks `X-Hub-Signature-256` (HMAC-SHA256 of the raw body with `META_APP_SECRET`; `401` if wrong), then stores every event and answers `200 { received }`. If storing fails it answers `500` and Meta retries; every write is idempotent on WhatsApp's message id. |

What it stores:

- Text, button replies and list replies: `record_inbound_message` (same as `POST /v1/internal/inbound`). A tap on `quote_approve:<id>` also approves that quote.
- Location: `save_customer_location`.
- Image, video, voice note: a `media` row and the message first, then (after answering Meta) the file is downloaded from the Cloud API into the `media` bucket at `conversations/<conversationId>/<uuid>.<ext>`. Types the bucket does not accept (for example `audio/amr`, documents) are logged and skipped.
- Delivery receipts: `delivered`, `read`, `failed` update the outbound message.
- Anything else (stickers, reactions) is logged and skipped.

It does not yet run Zukki's reply (`/assist`) on its own; see "Not built yet".

### Sending

The server sends queued owner and Zukki messages every `OUTBOX_POLL_MS` (default 2000, `0` turns it off), in the formats of `handoff-ui/whatsapp/payloads`: owner text as payload 11 (`*Business · First name*` line), polished replies as payload 12 (footer and Sounds good / Ask a question buttons), Zukki text as plain text. Each message is recorded as `sent` with WhatsApp's id or as `failed`.

## WhatsApp integration (`/v1/internal`)

| Method and path | Body / query | Returns |
|---|---|---|
| `POST /inbound` | `{ waId, waMessageId, kind: text\|media\|button_reply\|list_reply, text?, payload?, mediaId?, profileName?, receivedAt? }` | `{ conversationId, messageId, duplicate, isNewConversation, businessChatOpen, businessId }`. If `duplicate`, Meta retried: do not reply again. Button and list replies need `payload.id`. |
| `POST /conversations/resolve` | `{ waId, profileName?, receivedAt? }` | The conversation id, for uploading media before `/inbound` |
| `POST /conversations/:id/location` | `{ waMessageId, latitude, longitude, address?, receivedAt? }` | `{ messageId, customerLocationId, duplicate }` |
| `GET /conversations/:id/matches` | `?category=plumbing&exclude=<id,id>` | Payload 07 cards: `businessId, name, shortName, rating, reviews, distanceKm, etaMinutes, openNow, takesNightJobs, visit, nightFee {amount, window}, repairFrom, currency`. Skips businesses already offered or shown in this chat. |
| `POST /conversations/:id/connect` | `{ businessId, suggestedMin?, suggestedMax? }` | `201 { offerId, attempt, expiresAt, distanceKm }` ("Connect me") |
| `POST /conversations/:id/assist` | `{ type: text\|audio\|image\|video, text?, caption?, mediaId?, firstInConversation? }` | Zukki's turn: `{ disclosure, reply, transcript, valve, markedFrameUrl }`. Send `disclosure` first (payload 01) when set; `markedFrameUrl` is payload 04's image. |
| `POST /quotes/:id/approve` | | `{ quoteId, jobId, status }` for `quote_approve:<id>`. `422` for an old quote. |
| `POST /outbox/claim` | `{ limit? }` | Owner and Zukki messages to send, each claimed once: `id, waId, kind, body, payload, polished, businessShortName` |
| `POST /outbox/send` | `{ limit? }` | Sends what is queued now through the Cloud API: `{ sent, failed }`. `503 whatsapp_not_configured` without the WhatsApp settings. |
| `POST /whatsapp/send` | `{ to: waId, text }` | Test send: `{ waMessageId }`. Not stored in a conversation. WhatsApp delivers free text only within 24 hours of the customer's last message. |
| `POST /messages/:id/result` | `{ waMessageId }` or `{ waMessageId: null }` on failure | `{ id, status, waMessageId }` |
| `POST /delivery-status` | `{ waMessageId, status: delivered\|read\|failed }` | `{ updated }`. Receipts only move forward. |

### Typical inbound flow (if another service handles the webhook)

With `/webhooks/whatsapp` pointed at this API, steps 1-3 and 7 happen here already.

1. Webhook arrives: answer 200 to Meta right away.
2. Media: `POST /conversations/resolve`, upload to the `media` bucket at `conversations/<conversationId>/<file>`, insert the `media` row, then `POST /inbound` with `mediaId`.
3. Otherwise `POST /inbound` (or `/location` for a location).
4. If `businessChatOpen`, the message is for the business (the owner app sees it in real time). Only the text "Zukki" goes to Zukki (payload 15).
5. Otherwise `POST /conversations/:id/assist` and send the result (payloads 01, 03, 04).
6. Location shared: `GET /matches`, send payload 07. "Connect me": `POST /connect`, send payload 08.
7. A loop drains `POST /outbox/claim`, sends each message, and reports `POST /messages/:id/result`; status webhooks go to `POST /delivery-status`.

## Configuration

`apps/api/.env` (see `.env.example`): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ZUKKI_SERVER_KEY` (32+ characters), `META_MODEL_API_KEY`. Without them `/v1` answers `503 not_configured` naming the missing variables.

WhatsApp (optional as a group; without it the webhook answers `503` and nothing is sent): `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` (16+ characters, we choose it), `META_APP_SECRET`, optional `WHATSAPP_GRAPH_VERSION` (default `v23.0`). `WHATSAPP_BUSINESS_ACCOUNT_ID` and `META_APP_ID` are kept for reference; the code does not need them. Server: `PORT` (default 3000), `OUTBOX_POLL_MS`.

On a deployed server, set these in the host's environment settings instead of a file. Share the values through a password manager, never in chat or GitHub. A temporary access token from the API Setup page expires after about a day; use a System User token for anything longer.

## Not built yet

- Push notifications to the owner on a new request (Expo push from `push_tokens`).
- Running Zukki's reply automatically after an inbound message (the webhook stores it; `/assist` and queuing its answer are still called separately). Needs model credits.
- The pipeline's `downloadMedia` (`src/worker/live-deps.ts`) reading the file the webhook stored in the `media` bucket.
- Offering the next business automatically when an offer expires (`expire_handoffs` returns the expired offers; the loop that sends payload 09 + 07 is part of the WhatsApp side).
