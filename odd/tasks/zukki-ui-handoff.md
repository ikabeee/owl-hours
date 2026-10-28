---
status: done
---

# Integrate Zukki UI handoff into the repo

Copy the complete UI handoff (WhatsApp payloads + owner app + demo + docs) into the repo so coding agents read it from the tree, and point the README at it.

## Specs

- S1: The handoff folder and its HANDOFF-UI.md land in the repo under `handoff-ui/`, byte-identical to the source.
- S2: Full copy, including PNGs and owl animations (~17 MB); no binaries excluded.
- S3: README points agents at the new handoff; the old `docs/HANDOFF.md` model doc stays untouched.

## Tasks

- T1: tracking doc (this file), S1-S3, route: inline, commit: n/a
- T2: copy `zukki-ui-handoff/` to `handoff-ui/`, S1-S2, route: inline, commit: uncommitted (user did not ask to commit)
- T3: README layout entry for `handoff-ui/`, S3, route: inline, commit: uncommitted
- T4: verify with `diff -rq` source vs copy, S1, route: inline

## Log

- L1 (user, verbatim): `"/Users/carlglzm/Downloads/zukki-ui-handoff" "/Users/carlglzm/Downloads/HANDOFF-UI.md" Este es el handoff`
- L2 (user decision): scope = `Integrar handoff al repo`.
- L3 (user decision): binaries = full copy (`Todo completo`).
- L4: target path `handoff-ui/` chosen by agent (mirrors the zip so "hand this folder to the coding agents" keeps working); no commit per repo safety rules.
- L5 (close): T2 `diff -rq` clean, 195 files both sides; T3 README links `handoff-ui/HANDOFF-UI.md` + layout entry; T4 verified via diff + file counts. Uncommitted: `handoff-ui/`, `odd/`, `README.md`. Next: build from the handoff (demo path first, per HANDOFF-UI.md §5).
- L6 (follow-up, user): main merged the mascot pack (`apps/owner/assets/mascots/zukki/`). Removed the md5-identical duplicates from the three `handoff-ui/` owl folders (9 WebP + `static.png` each); kept `avatar.png` (unique, referenced by 8 HTML mocks) and `starter/.../owl/*.ts` (code, wired to `Owl.tsx`; `static.ts` embeds the same idle frame as base64). Added a `README.md` pointer in each folder + a Consumers section in the mascot README.
