---
status: done
---

# Story Pack review fixes on Crystal's stack (#26 → #27 → #22)

Objective: apply the round-3 review should-fixes on the three PR branches. Worktrees `owl-hours-worktrees/fix-pr{26,27,22}`.
Coders: muse (#26), agy gemini-3.8-flash-high (#27, #22); fallback Sonnet subagents. Test runner: `node --test` via pnpm workspace scripts.
Delivery: local commits per branch; push only after the user approves (branches belong to Crystal; her agent Murphy also works on them).

## Specs

Reviews: `tmp/review.md` in each worktree (copies of the posted reviews).

PR #26 (`feat/owner-auth-session`)
- S1 Sign-out succeeds when the stored session pointer is unreadable (invalid manifest or a SecureStore read error): the pointer key is removed.
- S2 Sign-in succeeds when the old manifest is unreadable: it is treated as nothing to clean up and the new session is saved.
- S3 Old-chunk cleanup after the new manifest is committed is best-effort: `setItem` resolves even if removing old parts fails.
- S4 When the local session is cleared but server revocation fails, the owner does not see `signOutError`.
- S5 `OwnerAuthProvider` accepts an injected runtime; restore and sign-out state are tested through it (or through an extracted pure controller if rendering is unavailable).

PR #27 (`feat/story-pack-data`)
- S6 A Story Pack selects exactly two photos, one before and one after, everywhere: shared schema, API and SQL eligibility.
- S7 `content_story_evidence.test.sql` uses a different assigner so an audit overwrite is detectable.
- S8 `listContentPhotoJobs` stops repeating the consent/blocked filter that SQL already applies.
- S9 Deleting a job or conversation that has a Story Pack draft does not abort and never physically deletes the draft: "Mejor mandemos borrados logicos para que no tengamos problemas". The draft gets `deleted_at` set (logical delete) when its job disappears, keeps its row, is hidden from Story Pack listings, and can no longer be edited, approved or handed off. The check allows a null `source_job_id` only on a logically deleted Story Pack. Scope: Story Pack drafts only; jobs/conversations keep their existing hard-delete cascade (a project-wide soft delete would be a separate feature).

PR #22 (`feat/zukki-marketing-story-pack`)
- S10 Photo assignment controls and the sign-in form use Astryx components instead of raw HTML.
- S11 The approval media snapshot is built in `lib/` and tested; an asset without a revision blocks approval instead of sending `''`.
- S12 A dirty draft keeps only its editable copy (caption, slides, platforms); server-owned fields (status, canHandoff, updatedAt, approval data) come from the latest pack.
- S13 `StoryPackScreen.tsx` is split into one file per component, with no behavior change.
- S14 Back is disabled while exporting or approving.
- S15 Text limits come from `@owl-hours/shared` (after #27 exports them; done by the parent after rebase).

## Tasks

- T1 #26 S1-S5 — muse — done, 4c3fdc4 (owner 331/331, typecheck ok; cleaner fixed restore race, safeError, StrictMode subscription)
- T2 #27 S6-S9 — agy — done, 2d63dbc (shared 15/15, api 237/237, typecheck ok, all 10 SQL suites green under amd64 emulation)
- T3 #22 S10-S14 — agy — done, 2d90dad (cleaner split StoryPackScreen, Astryx IconButtons)
- T4 Merge #26 into #27 (032c434) and #27 into #22 (408e1e1, 80d1e01), S15 (3a9c3b8, d633264), seam check — parent — done

## Log

- L1 (2026-10-30) User: "Mejor manda a corregir con mis coders (gemini) en caso de que se quede sin cuota lanzaras a sonnet a terminar ese trabajo"
- L2 (2026-10-30) User: "Tambien agrega a muse como coder, los repartes para que la iteracion sea rapida"
- L3 (2026-10-30) User on S9: "Mejor mandemos borrados logicos para que no tengamos problemas"
- L4 (2026-10-30) #27 evidence: SQL suites needed `DOCKER_DEFAULT_PLATFORM=linux/amd64` (postgis/postgis:17-3.5 has no arm64 image). Parent fixed test fixtures: drafts inserted as owner with Mario's claims (column grant excludes `id`); S9 conversation case reuses the seeded conversation (jobs need a handoff); the 3-photo fixture uses a `job_photo` instead of an impossible second `after`. S6 clarified: exactly two photos per *selection*; the source picker only requires one before and one after on the job (Crystal's fixtures keep extra story photos on a job). Nested ternary in owner-content-photos replaced by a label map.
- L5 (2026-10-30) Stack integrated with merges, not rebase, because #22 already merges its base and a rebase would force-push Crystal's branches. Seam check on #22 tip: whatsapp 14, shared 15, meta-models 14, owner 382, api 237 all pass; typecheck 5/5; web export ok; git diff --check ok. Remote branches unchanged since review (22f0941, 5e865dd, 51c3165), so pushes are fast-forward. Pending: user approval to push; independent verifier not run; follow-ups: StoryPackScreen (~240-line component) and StoryPackEditor (~420-line component) still long.
- L6 (2026-10-30) User: "haz el push y manda los comentarios en cada PR". Pushed fast-forward: 22f0941..4c3fdc4, 5e865dd..3a9c3b8, 51c3165..d633264. Summary comments posted on #26, #27, #22. Next: CI on the pushed heads; #22 still shows CHANGES_REQUESTED from round 2.
