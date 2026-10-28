// DOM-side owl. Import only from 'use dom' files.
// Each state is its own module, so a screen bundles only the states it uses.
import staticSrc from './owl/static';

export type OwlState = 'idle' | 'waving' | 'running' | 'running-right' | 'running-left' | 'jumping' | 'failed' | 'waiting' | 'review';

const CELL_W = 192;
const CELL_H = 208;
const HEADROOM = 60; // empty space above the head, used by the jump

/**
 * @param src   the state's data URI, e.g. `import waving from './owl/waving'`
 * @param scale uniform scale of the 192×208 cell (never resize to the visible bounds)
 * @param clip  hide the jump headroom for grounded states shown inline (never for 'jumping')
 */
export function Owl({ src, scale = 1, clip = false, alt = 'Zukki' }: { src: string; scale?: number; clip?: boolean; alt?: string }) {
  const w = Math.round(CELL_W * scale);
  const h = Math.round(CELL_H * scale);
  const img = (
    <picture>
      <source srcSet={staticSrc} media="(prefers-reduced-motion: reduce)" />
      <img src={src} width={w} height={h} alt={alt} style={{ display: 'block', width: w, height: h, maxWidth: 'none' }} />
    </picture>
  );
  if (!clip) return img;
  const top = Math.round(HEADROOM * scale);
  return (
    <span style={{ display: 'block', flexShrink: 0, width: w, height: h - top, overflow: 'hidden' }}>
      <span style={{ display: 'block', marginTop: -top }}>{img}</span>
    </span>
  );
}
