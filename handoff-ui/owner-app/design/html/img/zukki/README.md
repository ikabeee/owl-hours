# Owl images (deduplicated)

The nine animated WebP files and `static.png` that used to live here were
byte-identical duplicates of the canonical mascot pack, so they were removed.
The single source of truth is:

- [`apps/owner/assets/mascots/zukki/`](../../../../../../apps/owner/assets/mascots/zukki/) — `animations/*.webp`, `owl-static.png`, `animations.json`

Kept here:

- `avatar.png` — 192x192 chat avatar referenced by the design HTML. It has no
  counterpart in the canonical pack yet; fold it in there if the avatar survives
  the real UI.

To preview the design HTML with the owl again, copy the files back:

```sh
cp apps/owner/assets/mascots/zukki/animations/*.webp <this-folder>/
cp apps/owner/assets/mascots/zukki/owl-static.png <this-folder>/static.png
```
