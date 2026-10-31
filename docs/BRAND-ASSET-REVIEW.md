# Zukki — brand inventory and mockup disclosures

30 October 2026 · Discussion draft · Documentation only; no asset or implementation changes

We can address this without redesigning the whole project. Crystal confirmed that the Zukki owl is the team's own artwork: **keep it; it is outside the replacement scope.** The items below separate actual brand graphics, platform-name text, interface mockups, and technical identifiers.

The organizer message forwarded by our teammate is the working constraint for this discussion. It directs exception requests to `up_exceptions@meta.com` and says to use original assets and naming until Meta approves. No exception request has been sent and no permission has been obtained. This inventory does not establish approval.

## Proposed submission treatment

Keep the original Zukki owl. For any selected legacy concept screens, clearly label them as **conceptual mockups** in the submission document and beside the relevant slide or video scene. Their purpose is to illustrate possible applications, not to prove a working platform integration.

Suggested caption:

> Conceptual mockup illustrating a possible workflow. This is not a recording of a live integration.

Describe implemented capabilities separately and support them with actual runtime evidence. The team proposes disclosure first, not an immediate redesign or blanket asset replacement. Whether specific third-party brand graphics may appear in those mockups remains a question for Meta; adding a mockup label does not itself establish permission. Under the forwarded instruction, use original assets and naming until approval. The proposal to retain branded mockups is conditional on that approval, not authorization to submit them now.

## What we found and what we could do

| Item | Finding | Proposed approach — not yet implemented |
|---|---|---|
| **Zukki owl** | Team-original artwork, confirmed by Crystal. | Keep. No replacement needed. |
| **Facebook sign-up graphic in the handoff** | One explicit blue-circle/white-`f` SVG and its matching screenshot. [HTML source](https://github.com/ikabeee/owl-hours/blob/51c3165b39b68a55c44218a2218adc0c48deb504/handoff-ui/owner-app/design/html/OwSignUp.dc.html#L30). | If selected for submission, identify this as a conceptual sign-in screen and ask whether this specific graphic may appear in a labeled mockup. Consider a neutral symbol or a narrow exception only if needed. |
| **Older Marketplace mockups** | Two HTML/PNG pairs reproduce Marketplace-style screens. This is a mock interface, not evidence of a working Marketplace integration. [Source example](https://github.com/ikabeee/owl-hours/blob/51c3165b39b68a55c44218a2218adc0c48deb504/design/screens/HfMarket.html#L22). | Label selected screens as conceptual examples of a possible local-business workflow. Confirm whether their platform branding may be shown; an original Zukki layout is a fallback if required. |
| **WhatsApp-style demo screens** | 21 candidate PNG locations across old design, demo, and handoff folders; this count includes possible duplicates. The demo README describes HTML-generated screenshots for slides/video. A representative image was visually checked. | Label selected scenes as conceptual chat mockups. Do not describe existing HTML mocks as real device footage. Ask about permission for the particular branding/UI shown; distinguish this from any separately recorded real app footage. |
| **Story Pack, PR #22** | `Meta accounts are not connected`, `Facebook Story`, and `Instagram Story` are text. The icons are generic Lucide `Share2` and `Camera`, not platform logos. [Copy](https://github.com/ikabeee/owl-hours/blob/51c3165b39b68a55c44218a2218adc0c48deb504/apps/owner/features/story-pack/copys/contentCopys.ts#L33). | Consider `Manual export only` and one `Story images · 1080 × 1920` format. Both current choices produce the same image format. This would also require checking the selection/export contract, not just changing labels. |
| **Owner app, landing page, and T6 publishing flow** | Platform names appear as text in chat/approval copy, landing copy, and T6 account/publishing destinations. No official platform logo was found in the inspected runtime components. The landing footer also names the hackathon. T6 is a mock-backed account/publishing UI at this snapshot; this inventory does not establish live platform connections or publishing. | Ask whether accurate, logo-free references to real services and the event are allowed. General marketing copy can use neutral wording; actual login and publishing destinations must stay understandable and accurate. |
| **Backgrounds and other supporting assets** | Three copies of `wa-pattern.svg` share the same hash; their authorship was not established. Final selected business imagery, fonts, and audio were not fully audited. | Check provenance only for assets selected for the submission. If the background's source is unclear, an original plain background is a simple fallback. This does not reopen the confirmed ownership of the owl. |
| **Final video, pitch, and reused screenshots** | Final submission files were not available in the inspected checkout. Five Story Pack review screenshots are attached to PR #22; they are not proof that the final submission is clear. | Once the team chooses a direction, inventory the actual video timestamps and pitch slides. Regenerate affected captures from updated source; do not leave stale branding in exported materials. |

## Exception request and fallback

**Request approval for the specific intended use.** Identify the selected assets/screens, their sources, and exactly where each will appear in the prototype, demo video, and pitch. Send these details and representative images to the address in the organizer message, `up_exceptions@meta.com`. Ask for written confirmation of the permitted uses. Sending the request is not approval.

**Original presentation assets remain the fallback.** If approval is pending or the selected branding is not permitted, use original artwork and naming in submission materials, while preserving truthful technical explanations as permitted by the applicable guidance. This PR does not implement any replacements.

For now, select the actual demo/pitch scenes and agree on the scope. **Do not replace assets, rename integrations, or edit handoff sources yet.** Under `AGENTS.md`, a handoff file remains byte-identical until the PR that ships its real replacement retires it. Any later presentation or implementation change must respect that rule; this proposal does not authorize editing or deleting handoff sources.

## Questions to resolve with the organizer

1. Does “original assets and naming” also restrict factual plain-text references to integrations, model attribution, and the hackathon's name?
2. May the selected legacy screens appear as clearly labeled conceptual mockups? Separately, are recordings of a real WhatsApp client allowed in the demo?
3. Would an exception cover each listed use in the prototype, demo video, and pitch, and are there required captions or other conditions?

## Exception email draft — not sent

Complete the usage list and attach the selected screenshots before sending. For each item, record the brand element, its source, whether it is a mockup or real footage, and its prototype screen, video timestamp/scene, and pitch slide. Write “not used” for surfaces where the asset will not appear.

**To:** up_exceptions@meta.com

**Subject:** Brand asset exception request — Zukki hackathon prototype, demo video and pitch

> Hello Meta team,
>
> We are building Zukki for the Meta Global AI Developer Hackathon. We would like to request permission for the specific brand elements and placements listed in the attached usage sheet and screenshots.
>
> Our Zukki owl is our own original artwork and is not part of this request. The materials being considered include a Facebook sign-up icon, Marketplace-style concept screens, and WhatsApp-style chat mockups. These would illustrate possible applications; the mockups would be clearly labeled and would not be presented as recordings or proof of working integrations.
>
> The attached list identifies exactly which items we propose to use in the prototype, demo video, and pitch. Could you confirm whether these uses are permitted and whether you require any changes, attribution, or additional disclosure? Please also clarify the treatment of factual, logo-free platform names and any separately identified real app footage.
>
> We understand that submitting this request is not approval, and will follow the instruction to use original assets and naming until approval is granted.
>
> Thank you,
>
> The Zukki team

## Technical boundaries and evidence

Do not rename SDKs, API domains, database enums, or schema keys as a cosmetic fix. They are functional identifiers. Story Pack also exports platform keys in its manifest; a generic-export proposal needs a contract review. T6's intended account/publishing destinations should not become ambiguous “Channel A/B” labels.

Read-only audit snapshots: PR #22 `51c3165`, main `a3bb9f8`, and T6 `feat/owner-content` at `b124694f`. Source searches and representative image inspection support this inventory; it is not an exhaustive review of all historical images, uploaded media, or final presentation files. The audit did not modify code or assets; this PR adds only this discussion document.

Meta's [company brand guidance](https://www.meta.com/brand/resources/meta/company-brand/) describes approval requirements for the Meta logo and points to individual app guidelines. Its [permission-request guidance](https://www.meta.com/brand/resources/meta/my-request/) calls for reviewing the relevant use and materials, including mocked-up brand placements. Mockup disclosure addresses what a screen demonstrates; it is not itself brand permission. The [WhatsApp brand guidance](https://www.meta.com/en-gb/brand/resources/whatsapp/whatsapp-brand/) also addresses alterations and media use. These general pages do not independently verify the hackathon-specific message or clear our submission.
