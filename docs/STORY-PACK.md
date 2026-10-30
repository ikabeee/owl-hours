# Story Pack: opt-in setup and acceptance

Story Pack lives at `/story-pack`. It does not replace the Content tab or T6's
publish/schedule screens. Their component, route and handoff artifacts remain
identical to `main`. The feature is a draft for team review.

## Review and merge order

The changes are separated into dependent review slices:

1. [Owner authentication PR #26](https://github.com/ikabeee/owl-hours/pull/26),
   branch `feat/owner-auth-session`: shared session infrastructure, callback
   handling, secure persistence and owner API browser origins.
2. [Story Pack backend PR #27](https://github.com/ikabeee/owl-hours/pull/27),
   branch `feat/story-pack-data`, based on `feat/owner-auth-session`: SQL, API
   and shared contracts.
3. [Story Pack frontend PR #22](https://github.com/ikabeee/owl-hours/pull/22),
   branch `feat/zukki-marketing-story-pack`: the opt-in workspace and export UI,
   depending on the preceding slices.

Review and merge those dependencies in that order. Local integration and test
results below do not mean any of these PRs has been merged or deployed.

## Modes and sign-in

For a web build connected to the owner API, configure:

```dotenv
EXPO_PUBLIC_API_URL=https://your-api.example
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

On the API, set `OWNER_APP_ORIGINS=https://your-owner-app.example`. The allowlist
accepts exact origins, not paths or wildcards; localhost HTTP is allowed for
local development. If TLS terminates at a proxy, also set
`OWNER_PUBLIC_ORIGIN=https://your-api.example` to the trusted external API
origin. Arbitrary forwarded headers do not establish a trusted origin.

Owner authentication is shared infrastructure, with a dedicated `/auth` entry
and `/auth/callback` route. Add the deployed web origin's `/auth/callback` URL
and `zukki-owner://auth/callback` to the Supabase Auth redirect allowlist.
Existing owners receive a PKCE email sign-in link; this flow uses
`shouldCreateUser: false`. Open the link on the same device/browser that
requested it. The root provider handles cold and warm native callbacks and
foreground/background refresh. Story Pack reuses the shared session and
clears prior-owner data when the session changes. Server keys must never be
included in the owner app. See [Owner authentication](OWNER-AUTH.md) for
callback configuration, storage behavior and the device acceptance checklist.

Without the three public settings the workspace displays a configuration
message. A demo requires `EXPO_PUBLIC_STORY_PACK_MODE=demo`; it uses synthetic
images and an in-memory store. Demo drafts intentionally reset on page reload.
A failed live connection never silently switches to demo data.

Native callback handling, secure session persistence and ZIP sharing are
implemented. Actual iOS/Android login and sharing acceptance remains pending;
a bundle export or synthetic adapter test is not installed-device acceptance.
No hosted redirect settings were changed during this work.

## Owner workflow

1. Open a completed job in **Confirm job photos**. Its latest customer
   photo-sharing consent must already be recorded through the customer flow.
   The owner cannot grant it here.
2. Explicitly choose two distinct before/after photos and confirm their roles.
   Story Pack stores these roles in `media.story_role`, separately from the
   original `media.role`. Customer evidence therefore remains visible to the
   request flow. Replacing a pair clears only the Story Pack selection; it
   preserves the original evidence role and first job-assignment attribution.
   Missing consent, other-job media and ambiguous multi-business conversations
   block assignment; no image URLs are returned for blocked jobs.
3. Create a Story Pack, edit all three slides and caption, choose at least one
   format, and save. The live adapter reloads saved copy and selected photo IDs
   from the API. A failed save retains local edits. If the owner keeps typing
   while a save is pending, the saved submission becomes the baseline and the
   newer text remains visibly unsaved. A late save cannot switch the editor
   back to a different pack.
4. Approve the displayed copy and photos. Approval binds the submitted draft
   version to the exact selected photo IDs, roles and revisions. New edits made
   before the save completes stop automatic approval; the owner must review
   and approve again. Approval locks the inputs while its request is pending.
   Another tab's intervening edit or changed photo snapshot produces a conflict
   instead of approving unseen content. Older drafts without slides must be
   recreated. The review response intentionally returns `canHandoff: false`;
   the UI refreshes current eligibility before enabling export. It only adopts
   refreshed eligibility for the same write version, never an unseen newer
   draft version.
5. Prepare the handoff. The export hook authorizes the selection before fetching
   images and again after rendering. It downloads or opens native sharing for
   a ZIP containing `story-01.png` through `story-03.png` (1080×1920),
   `caption.txt` and `manifest.json`. The manifest contains no signed URLs or
   auth tokens. Equivalent snapshot key or media ordering does not invalidate
   an otherwise unchanged export.

The persisted status remains `approved`. `deliveryReceipt` is separate local
UI state recording when the download/share UI opened; it is not a member of
`StoryPackStatus` and is not written to the API. It may survive a list refresh
within the current workspace session, but not a full reload or owner change.
Every new export must reauthorize. Nothing is scheduled or published, and
opening a share sheet does not prove that a recipient received the file.

The DOM bridge sends a bounded base64 ZIP payload instead of a JSON number
array. Native writes it with base64 encoding, opens the share sheet and removes
the temporary cache file when sharing returns or fails. A failed delivery does
not create a success receipt. Web decodes the payload for its local download.

Revoked consent or an invalid selected photo blocks subsequent export even
if another eligible after-photo exists. Source eligibility targets the selected
job and is independent of the newest-100 picker window. Signed URLs expire
after ten minutes; already issued URLs and downloaded files cannot be recalled.
Photo revisions are produced in SQL from storage paths. The existing writers
use UUID paths with `upsert: false`; out-of-band replacement of bytes at the
same path is outside this revision model.

## Reproducible checks

```sh
npm test
npm run typecheck
DOCKER_DEFAULT_PLATFORM=linux/amd64 bash scripts/db-test.sh
bash scripts/story-pack-acceptance.sh
```

The connected acceptance script creates disposable local PostGIS and
PostgREST containers. It drives the product HTTP client and shared schema
through the real HTTP API, services, RLS and SQL. Its Auth and signed-PNG Storage
endpoints are explicitly local synthetic fixtures, not live Supabase services.
It checks photo assignment, save/reload, approval, repeated handoff, revocation,
stale selected photos, concurrent copy edits and post-approval role swaps.
`--serve` leaves this synthetic fixture available for browser inspection until
the process is stopped. Do not use its synthetic credentials outside localhost.

The SQL suite applies each migration in its own transaction. The `story_pack`
enum value remains in a preceding migration, because Supabase CLI 2.122.0
reproduced PostgreSQL `55P04` when the same transaction added and used that
value. The later Story Pack schema changes are folded into the main feature
migration. No migration was applied to a hosted database during this work.

## Recorded local result — round 2 (2026-10-30)

All five workspace test tasks passed: **628 tests** (Owner 360, API 229,
shared 11, WhatsApp 14 and model adapters 14). All five typechecks passed.
The local database checks passed with **13 migrations and seven SQL suites**.
The connected synthetic acceptance passed **13 checks**, including a real HTTP
`409` for a stale approval; that local request completed in 39 ms. This timing
is an observed fixture result, not a production performance guarantee.

The round-2 Expo web and Android exports passed. Browser acceptance exercised
sign-out, PKCE sign-in and callback URL scrubbing, create/edit/save, a full
reload with persisted copy and format, approval, and ZIP download. The ZIP
passed CRC verification and contained exactly three 1080×1920 PNGs, the saved
caption and an unpublished manifest. With consent withdrawn in the disposable
fixture, all photo previews disappeared and the approved pack's export was
disabled. At 390×844 the overview and blocked editor had no horizontal overflow.
The final responsive action fix displays the complete download label.

Controller, editor-state and export-orchestration tests cover pending saves,
owner changes, exact approval versions and base64 delivery. These tests are not
React-mounted hook tests. Screenshots are attached to the PR rather than added
as repository binaries; see the [evidence index](evidence/story-pack-20261030/README.md).

## Remaining team acceptance

- Exercise configured hosted Supabase Auth/Storage and owner data, including
  the dedicated email callback; this has not been accepted in a hosted environment.
- Accept native device login, image rendering and share-sheet behavior on
  iOS/Android using approved test data.
- No Meta linking, scheduling, posting or paid model operation was attempted.
- This is an opt-in draft. The team retains the decision to merge the review
  slices and expose an entry point from the main owner navigation.
