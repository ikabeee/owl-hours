# Zukki: project docs

Documentation for our Meta Global AI Developer Hackathon project (Oct 26 – Nov 4, 2026). Drop this folder into the repo as `docs/`.

## Read in this order

| File | What it is | For |
|---|---|---|
| `01-PRODUCT.md` | The idea, the three scenarios, owner message options A/B, model usage, scope and risks | Everyone |
| `02-HANDOFF.md` | Full build context: rules, screens, data model with tenants, handoff states, Zukki's tools, WhatsApp and publishing specifics, design rules | Developers and coding agents |
| `03-ARCHITECTURE.md` | Eight architecture diagrams in Mermaid (render on GitHub) | Developers and coding agents |

## Folders

```
architecture/
  architecture.html      the eight diagrams as one page (open in a browser)
  png/                   each diagram as an image, for slides
  mermaid/               the Mermaid versions rendered to SVG
design/
  png/                   v4 Zukki screens (source of truth)
  screens/               the same screens as static HTML
  img/                   logos and illustrations (SVG)
  tokens.json            Astryx tokens + WhatsApp-native colors
  archive/
    draft1/ draft2/ v2/ v3/   earlier explorations, as PNG
    architecture-v1/          the first architecture (one business, own number)
```

## Screens in `design/png/`

1. **Flow 1:** 00a first contact without media (list message) · 00b the list WhatsApp opens · 01 request to Zukki · 01b location request · 02 Zukki suggests a business · 03 owner accepts within 5 min · 04 if the business doesn't answer.
   All customer screens use only message types the WhatsApp Cloud API can send (see `02-HANDOFF.md` §7).
2. **Owner messages:** 05 owner, option A · 06 customer, option A · 07 owner, option B · 08 customer, option B.
3. **Multitenant and marketing:** 09 business profile · 10 linked accounts · 11 review a post.

## Live links (claude.ai, ask Jorge for access)

- Design canvas, all versions: https://claude.ai/artifact/UkbqisQf78rdPrB1SDjiEF
- Architecture page: https://claude.ai/artifact/Kg885bhAGPC1UPvqtwKaeU

## Still to confirm

- Exact Meta Model API model IDs, request formats and rate limits.
- Publishing permissions in development mode for the team's test Page and Instagram.
- A real statistic on missed after-hours requests for the impact slide.

Last updated: Oct 27, 2026.
