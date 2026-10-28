# Zukki landing (Astro)

Informational one-page site for Zukki. Full spec: [HANDOFF-LANDING.md](./HANDOFF-LANDING.md).

```bash
# From repository root:
pnpm dev:landing      # http://localhost:4321
pnpm build:landing    # static output in apps/landing/dist/

# Or from apps/landing:
cd apps/landing
pnpm install
pnpm dev
pnpm build
```

- Colors, radii, type: `src/styles/tokens.css`
- All animations and their timelines: `src/styles/motion.css`
- Scenes play only while on screen: `src/scripts/inview.ts`
- Respect `prefers-reduced-motion`. It is already handled in `motion.css`.
