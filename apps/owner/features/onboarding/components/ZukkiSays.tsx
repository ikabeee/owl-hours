'use dom';

import { Owl } from '../../../shared/mascot/Owl';
import owlIdle from '../../../shared/mascot/owl/idle';
import owlRunning from '../../../shared/mascot/owl/running';

// ZukkiSays: the owl bubble the handoff uses before a lead sentence. Data only: the owl
// kind maps to its asset inside the DOM tree, so screens pass a key and text, not elements.
const owlByKind = { idle: owlIdle, running: owlRunning } as const;

export type ZukkiOwl = keyof typeof owlByKind;

export default function ZukkiSays(props: { owl: ZukkiOwl; text: string; tone: "muted" | "card" }) {
  return (
    <div style={saysStyle}>
      <Owl src={owlByKind[props.owl]} scale={0.42} clip />
      <span style={props.tone === "card" ? cardBubbleStyle : mutedBubbleStyle}>{props.text}</span>
    </div>
  );
}

const saysStyle = { display: "flex", alignItems: "flex-end", gap: 8 } as const;

const baseBubbleStyle = {
  flex: 1,
  marginBottom: 10,
  padding: "10px 14px",
  borderRadius: "16px 16px 16px 4px",
  fontSize: 15.5,
  lineHeight: 1.4,
} as const;

const mutedBubbleStyle = { ...baseBubbleStyle, background: "var(--color-background-muted)" } as const;

const cardBubbleStyle = { ...baseBubbleStyle, background: "var(--color-background-card)" } as const;
