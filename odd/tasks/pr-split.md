---
status: done
---
# PR split into stacked review slices

Objective: split every open PR over 400 changed lines into stacked PRs to `main`. Strategy: `stacked-to-main` (approved 2026-10-30). Runner: `npm test`, `npm run typecheck`, `npm run build` in `apps/owner`.

## Specs

- S1. "los PRS que tienen gigantes diffs, hazles split" — scope "#29 y los de Crystal" (#29, #26, #27, #22).
- S2. Each slice is one cohesive behavior with its tests and docs, builds and passes CI alone, and is ≤400 changed lines or is marked `size:exception` with its reason.
- S3. Slices stack in order; the original PR stays as the last slice of its chain (retargeted), so its number and discussion survive.
- S4. Each slice PR body carries the Chain Context section with a 📍 dependency diagram.
- S5. Each slice deletes the handoff files of the screens it ships (AGENTS.md handoff retirement rule).

## Tasks

| ID | Spec | Chain | Slices | Route | Status |
|---|---|---|---|---|---|
| T1 | S1–S5 | #29 onboarding | 9: service+odd · shell · intro · sign-up · verify (455, exception) · profile · prices · area · live | inline | done: #31–#38 + #29 as slice 9; head e7e98cb == 3ebe9f5 tree; every slice green |
| T2 | S1–S4 | #26 auth | 5: CORS · storage · session/client · controller · UI/routes | delegated (opus worker, context backstop) | done: #40–#43 + #26 |
| T3 | S1–S4 | #27 story-pack data | 4: shared contract · DB schema (exception ~1190) · photo-jobs API · drafts API (exception ~1055) | delegated (opus worker, context backstop) | done: #44–#46 + #27 |
| T4 | S1–S4 | #22 Story Pack editor | 11 (exceptions: 22.2, 22.6, 22.9, 22.10, 22.11); fix duplicate deps in apps/owner/package.json in 22.1 | delegated (opus worker, context backstop) | done: #47–#56 + #22 |

## Log

- L1 (2026-10-30, user): "los PRS que tienen gigantes diffs, hazles split"; scope answer: "#29 y los de Crystal"; plan answer: "lo apruebo".
- L2: Crystal's branches get rebased and force-pushed with lease; murphy and another session may also write there. No agent was running at plan time.
- L3 (2026-10-30): T1 done. Slices #31 service 317 · #32 shell 379 · #33 intro 384 · #34 sign-up 327 · #35 verify 455 (exception) · #36 profile 307 · #37 prices 337 · #38 area 349 · #29 live 361 (retargeted to 08-area). Tag split-src-29 = 3ebe9f5. Next: T2 (#26), delegated to one worker in its own worktree (context backstop); parent pushes.
- L4 (2026-10-30): T2–T4 done. Worker rebased Crystal's stack on main 05a41d6 (squashed per PR; history had 6 merge commits), sliced 20 branches, end trees identical to rebased sources. User chose "Autor Crystal": 20 commits re-authored to Crystal Chang, committer ikabeee. Pushed with lease (old tips 4c3fdc4/3a9c3b8/d633264), opened draft #40–#56, retargeted #26/#27/#22 as last slices, appended Chain Context, commented reset instructions on #26/#27/#22. CI green on all 20 (incl. pgTAP). DECISIONS: #26→D15, #27→D16, #22 D12–D15→D17–D20. package.json duplicates deduped in 22.1.
- Next: merge order #31…#29 (onboarding) and #40…#22 (Crystal, drafts — her call); onboarding D14 and Crystal D15+ do not collide. Pending objectives 4, 6, 7. Auth gate waits for #26's chain.
- L5 (2026-10-30, user): "descártalo y actualiza el pr-split.md". Dismissed the two round-1/round-2 CHANGES_REQUESTED reviews on #22 (5701654793, 5702942370); their blockers were fixed in 4c3fdc4/3a9c3b8/d633264 and carried into #40–#56.
