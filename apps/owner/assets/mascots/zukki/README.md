# Zukki mascot assets

This folder contains the supplied nine-action 2D owl sprite export. This is an asset-only contribution: it does not wire Zukki into an app screen or change existing UI. It is a web sprite export, not a newly installable ChatGPT v2 Pet.

## Files

- owl-nine-actions.png — transparent 8-column atlas, 1536 × 1872 pixels.
- animations/*.webp — transparent animated WebP files, one per action.
- owl-static.png — idle frame 0 for a reduced-motion fallback.
- animations.json — row order, frame counts, frame durations, looping, and file paths.

Each atlas cell is 192 × 208 pixels. Use the state row and frameCount in animations.json; do not render unused cells at the end of shorter rows. Keep the native cell bounds (or scale them uniformly) so the baseline and jump height stay aligned. The running state means active processing; use running-left or running-right for locomotion. For reduced motion, show owl-static.png.

## Consumers

This pack is the single source of truth for the owl. The UI handoff used to
carry its own copies (9 WebP + `static.png`, md5-identical) under `handoff-ui/`
in `owner-app/assets/owl/`, `owner-app/design/html/img/zukki/` and
`demo/html/img/zukki/`; those were removed. Each of those folders keeps a
`README.md` with the restore command, plus an `avatar.png` (192x192 chat avatar
used by the handoff HTML mocks) that has no counterpart here yet.

Note: `handoff-ui/owner-app/starter/components/dom/owl/static.ts` embeds the
same idle frame as a base64 data URI for the reduced-motion path.

## Source and usage

The supplied archive describes the pack as intended for a teammate's home screen. Its QA export review says it was built with built-in image_gen. The archive contains no license file or redistribution statement, and the repository has no declared license. Please confirm the asset creator's rights and desired license before broader redistribution or commercial use.
