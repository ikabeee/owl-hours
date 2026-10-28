# Owl Hours (Zukki)

AI agent for small local-service businesses (plumbers first) that takes
urgent requests on WhatsApp, helps the customer stop the damage, and
prepares the job ticket and quote from the owner's own rules.
A person confirms every job.

Full context: [docs/HANDOFF.md](docs/HANDOFF.md).

UI handoff (current, Oct 27 decisions): [handoff-ui/HANDOFF-UI.md](handoff-ui/HANDOFF-UI.md) — WhatsApp payloads, Expo + Astryx owner app, demo path.

## Hackathon

See [the hackathon guide](docs/HACKATHON.md) for event requirements, deadlines,
resources, and a proposed team plan (not yet agreed).

## Layout

- `apps/api` — Hono server (WhatsApp webhook, jobs, voice, studio) + worker
- `apps/owner` — Expo app for the owner/technician (Expo web for judges)
- `packages/shared` — job state machine, zod schemas, types
- `packages/meta-models` — Meta Model API clients (Spark, SAM, voice, image)
- `packages/whatsapp` — WhatsApp Cloud API sender
- `handoff-ui` — UI handoff: customer WhatsApp messages, owner app (Expo + Astryx), demo screens
- persistence — TBD, database not designed yet (`apps/api/src/store.ts` is in-memory)

## Checks

```sh
npm test
npm run typecheck
```
