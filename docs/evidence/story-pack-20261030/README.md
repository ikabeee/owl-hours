# Synthetic Story Pack browser evidence — round 2, 2026-10-30

Review: [PR #22](https://github.com/ikabeee/owl-hours/pull/22), depending on
[owner auth #26](https://github.com/ikabeee/owl-hours/pull/26) and
[data/API #27](https://github.com/ikabeee/owl-hours/pull/27).

The product web app used real HTTP client/API/PostgREST/PostgreSQL/RLS paths.
Auth and signed-image Storage were explicitly local synthetic fixtures. No
customer data, real sign-in email, hosted migration or platform post was used.

Verified in the browser:

1. Sign out, request a PKCE link, open its callback and verify a signed-in session
   with the code removed from the URL.
2. Create a pack, change its first slide headline and caption, select Instagram,
   save, fully reload, and verify the exact values persisted.
3. Approve the displayed version and download the ZIP. CRC passes; its five
   files contain three 1080×1920 PNGs, the saved caption and a manifest with
   `published: false`. No signed URL or token appears in the manifest.
4. Withdraw consent in the disposable fixture and reload. Photo previews
   disappear and the approved pack's export is disabled with an explanation.
5. Check the overview and blocked editor at 390×844: document and viewport
   widths both measure 390px. The final action layout keeps the download
   label fully visible.

The review reply contains five fresh screenshot attachments: desktop overview,
three-slide preview, approved pack/download, mobile overview and mobile export
blocked by withdrawn consent. Screenshots are removed from the branch's final
tree; previous commits still retain the earlier review evidence. No history was
rewritten. `caption.txt` and `manifest.json` retain the small textual ZIP proof.

`isDemo: false` identifies the HTTP adapter, not production data. These records
and images are synthetic. Hosted Supabase Auth/Storage and native device
login/rendering/sharing remain unverified. Web/Android bundle exports do not
replace that acceptance.

## Screenshot attachments

- [Desktop overview](https://github.com/user-attachments/assets/f002c899-3224-4c38-8daf-281cc32531ec)
- [Three-slide preview](https://github.com/user-attachments/assets/4c4dc6c3-f6c0-494f-995e-c0a045cb546b)
- [Approved pack and download](https://github.com/user-attachments/assets/6b06cc9d-1341-4e12-ae2b-a52be19e2e93)
- [Mobile overview](https://github.com/user-attachments/assets/bb741887-b2e8-4d05-a5c4-9751aba3daf4)
- [Mobile export blocked by withdrawn consent](https://github.com/user-attachments/assets/0f595c14-87bb-4b06-9e25-720391355147)
