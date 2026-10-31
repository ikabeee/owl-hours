# Story Pack data contract

This slice provides owner-scoped photo assignment, saved three-slide drafts,
atomic owner approval and short-lived export authorization. It contains no owner
screen, native sharing or social publishing integration. See [API endpoints](API.md).

## Photo selection and text limits

Story Pack accepts and enforces exactly two photos: one `before` and one `after` photo.
Both the draft creation schema (`selectedMediaSchema`), review approval schema
(`expectedMedia`), API eligibility verification, and database function
`private.story_pack_is_eligible` require `cardinality = 2` with distinct IDs and
one `before` and one `after` role.

Text lengths are bounded by `STORY_PACK_LIMITS`:
- Slide title: 60 characters
- Slide body: 280 characters
- Title: 80 characters
- Caption: 2200 characters

## Evidence and attribution

`media.role` continues to describe the original customer evidence or job photo.
Story Pack uses nullable `media.story_role` (`before` / `after`) independently.
Choosing or replacing a pair never rewrites the original role. Replaced photos
keep their exact job and original `job_assigned_by` / `job_assigned_at`; only the
active Story role is cleared. Initially unassigned photos receive their first job
attribution once. Request evidence remains visible through `owner_offers`.

The assignment RPC still requires an owner membership, completed job, accepted
handoff, unambiguous conversation, original image and existing customer consent.
It cannot grant consent. Shared SQL helpers supply these rules and produce the
storage-path revision used by both the API and approval snapshot.

## Review, delivery, and logical delete

Approval compares the owner's displayed `updatedAt` and exact media IDs, Story
roles and revisions inside the locked database transition. SQL orders both
snapshots by ID text with the same C collation; API comparison matches fields by ID, independent of JSON key
order. A changed displayed version returns a conflict.

The review response is a receipt with `canHandoff: false`. Draft refresh and the
handoff endpoint obtain current eligibility. API review does not scan sources
before and after the authoritative RPC. Where signing requires external Storage
I/O, a post-sign read remains deliberate: revoked consent or reassignment during
signing must not cause stale links to be returned. This cannot recall a link
already issued; links expire after ten minutes. No-source/no-sign paths skip the
second read. Every actual export must authorize again.

Deleting a source job or conversation does not hard-delete Story Pack drafts or abort
the deletion cascade. Instead, `content_drafts_source_job_fk` sets `source_job_id = null`,
and a `BEFORE UPDATE` trigger sets `deleted_at = coalesce(deleted_at, now())`.
The table check constraint requires `source_job_id is not null or deleted_at is not null`.
Logically deleted drafts are excluded from `listContentDrafts` via `deleted_at=is.null`
and return HTTP 404 (`not_found`) upon `updateContentDraft`, `reviewContentDraft`, or `handoffContentDraft`.
At the database layer, `private.review_content_draft` and the `content_drafts_update` RLS
policy reject logically deleted drafts.

T6's scheduling permissions and two-argument review remain available for its
existing sources. Story Pack independently blocks scheduling and publication.

## Migration and checks

These Story Pack migrations have not reached a shared hosted database. Their
intermediate definitions were consolidated into one feature migration plus the
preceding enum addition. Existing main-branch migrations are unchanged. The enum
must be committed before use, and the DB harness applies each file transactionally.

Run `npm test`, `npm run typecheck`, and `bash scripts/db-test.sh`. SQL regressions
cover evidence visibility and original audit preservation, tenant boundaries,
consent revocation, exact selected photos, stale copy, role swaps and T6 behavior.
These local fixtures do not establish hosted Auth/Storage or device acceptance.
