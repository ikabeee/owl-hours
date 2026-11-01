---
status: in-progress
---

# Customer WhatsApp payloads 01–15

Objective: each of the 15 customer messages is built complete, typed and limit-checked in one function in `packages/whatsapp`; `apps/api` consumes them; the handoff JSONs are retired.
Branch: `feat/whatsapp-payloads` (worktree `../owl-hours-worktrees/whatsapp-payloads`), base `67ca98d`. Delivery: `ask-on-risk`. Runner: `node --test` (explicit file lists in `packages/whatsapp/package.json:9` and `apps/api/package.json:8`), plus `npm run typecheck`.

## Specs

- **S1 — One builder per payload.** `packages/whatsapp/src/payloads/` exports one pure, typed function per payload 01–15 (03 is the read + typing indicator). Each takes its variable parts as a typed input (the `{{placeholders}}` of `handoff-ui/whatsapp/payloads/NN-*.json`) and returns the complete message: body, buttons, list sections, header, footer. Static parts (the 02 category list, the 12 buttons "Sounds good" / "Ask a question", the owner signature `*{{business_name}} · {{sender_first_name}}*`) live here, not in `apps/api`.
- **S2 — Cloud API limits.** The builders enforce the limits the API currently enforces in scattered places (`copy.ts` `clip`, `BUTTON_BODY_MAX`, `HEADER_MAX`, `FOOTER_MAX`; `outbox.ts` zod `zukkiCard` and `INTERACTIVE_BODY_MAX = 1024`): button title ≤ 20, header ≤ 60, footer ≤ 60, interactive body ≤ 1024, list row title ≤ 24. Behavior on overflow stays what it is today (clip where `copy.ts` clips; 12 falls back to text with the footer as last line when over 1024).
- **S3 — Conformance.** For each payload, a test builds it with the demo values and asserts the result equals the body of its `handoff-ui/whatsapp/payloads/NN-*.json` (placeholders filled with the same demo values). Once green, the expected body is written inline in the test and the JSON is deleted (AGENTS.md handoff retirement rule), including `_index.json` and the `MESSAGES.md` references when nothing else uses them.
- **S4 — API consumes the package.** `apps/api/src/orchestrator/copy.ts` delegates every payload to its builder; `apps/api/src/whatsapp/outbox.ts` `renderOutbound` / `renderZukki` dispatch by `kind` / `payload.variant` to the builders and no longer hold `CATEGORY_LIST`, `POLISHED_BUTTONS` or the signature format.
- **S5 — Invariant: the outbox row shape does not change.** The `{ kind, body, payload }` row queued to the outbox table (persisted in Postgres) keeps its exact shape and values, so rows queued before a deploy still render. The existing tests `apps/api/test/orchestrator-respond.test.ts` and `apps/api/test/whatsapp-outbox.test.ts` pass unchanged. `apps/api/test/customer-agent.test.ts` stops reading `01-disclosure.json` and `14-off-topic.json` from disk.
- **S6 — The three unhandled replies.** `reply_ok`, `reply_question` (12) and `quote_question` (13), today only logged at `apps/api/src/orchestrator/respond.ts:83`. Behavior (L4): the tap reaches the owner as a customer message in that business chat ("Sounds good" / "I have a question"); for `reply_question` and `quote_question` Zukki also tells the customer to type the question and that it goes to `{{business_name}}`. The owner answers from the app as usual.
- Out of scope: the extra texts with no payload (`cantFindValve`, `electricalSafety`, `describeNeed`, `askWhatTheyNeed`, `noneNearby`, `alreadyOffered`, `connectFailed`, `mediaFailed`, `somethingWentWrong`) stay in `copy.ts`.

## Tasks

| ID | Specs | Route | Status | Evidence |
|---|---|---|---|---|
| T1 | S1, S2, S3 (builders + conformance, JSONs still present) | Muse (coder), Opus review | done | RED 14/16 → GREEN 44/44; apps/api 190/190 unchanged |
| T2 | S4, S5, S3 retirement (API wiring, delete JSONs) | Muse (coder), Opus review; Risk item 1 guarded by S5 | pending | |
| T3 | S6 | Muse (coder), Opus review | pending | |

## Log

- **L1 (2026-10-30, user):** "Necesito que pongas a trabajar a gemini y muse para que realice los objetivos del 4 al 7. Primero explicame esos objetivos" → "Asigna los dos a Muse".
- **L2:** Mapping (explorer): all 15 payloads are already sent from `apps/api` (`orchestrator/copy.ts`, `whatsapp/outbox.ts`, `orchestrator/live.ts`, `agent/customer-agent.ts`); `packages/whatsapp` has generic builders only; 02, 07, 12, 13 are split between `copy.ts` and `outbox.ts`. Explainer: https://claude.ai/artifact/U16VcvyPiWiKA5xkYmqAAs
- **L3 (2026-10-30, user):** chose option "1" (move to `packages/whatsapp`, conformance tests, handle the 3 replies, delete the JSONs).
- **L4 (2026-10-30, user):** for the three replies chose "Pasar al chat del negocio (Recomendado)": "El toque llega al dueño como mensaje del cliente en su chat ("Sounds good" / "I have a question"). En las dos de pregunta, Zukki además le dice al cliente: escribe tu pregunta y se la paso a <negocio>. El dueño contesta desde la app como siempre."
- **L5 (RED, Muse):** `packages/whatsapp/test/payloads.test.ts` (15 conformance tests) + `payload-limits.test.ts` (6, S2), both added to `scripts.test`. `npm test`: 16 tests, 14 pass (pre-existing), 2 fail on missing exports. Operator decisions: A1 builders return `OutgoingMessage` without the envelope (`send()` adds it; test strips `messaging_product`/`recipient_type`), except 03 which `markRead` posts as is; A2 domain-structured inputs (needed for S4); A3/A4 only static titles pinned; A5 the 12 footer is clipped to 60 (S2). JSON-vs-API differences are all variants with no JSON counterpart (null-value lines, other categories, fallbacks): the builders keep today's API behavior for them, guarded by the existing apps/api tests (S5).
- **L6 (T1 GREEN, Muse):** 17 modules in `packages/whatsapp/src/payloads/`, `markRead` delegates to `typingIndicator`, new `test/payload-variants.test.ts` pins 9 variants with no JSON counterpart. Locked-test checksums unchanged. `packages/whatsapp npm test` 44/44, typecheck clean, `apps/api npm test` 190/190 untouched. Review: one readability fix in `markRead` (single call instead of a ternary over two calls). Next: T2 (API delegates to the builders, JSONs retired).
