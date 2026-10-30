import { Text } from '@astryxdesign/core/Text';
import { contentCopys as copy } from '../copys/contentCopys.ts';

export function WorkspaceBrandLine() {
  return (
    <section style={workspaceLineStyle}>
      <div style={shiftMarkStyle} aria-hidden="true">
        {copy.brandInitial}
      </div>
      <div style={workspaceCopyStyle}>
        <Text type="label">{copy.workspaceEyebrow}</Text>
        <Text type="supporting" style={workspaceTextStyle}>
          {copy.workspaceLine}
        </Text>
      </div>
    </section>
  );
}

const workspaceLineStyle = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  padding: '12px 14px',
  borderRadius: 12,
  background: 'var(--color-background-muted)',
} as const;

const workspaceCopyStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  minWidth: 0,
} as const;

const workspaceTextStyle = {
  fontSize: 16,
  lineHeight: 1.5,
} as const;

const shiftMarkStyle = {
  width: 42,
  height: 42,
  borderRadius: 14,
  display: 'grid',
  placeItems: 'center',
  background: 'var(--color-accent)',
  color: 'var(--color-on-accent)',
  fontWeight: 800,
  fontSize: 20,
  flexShrink: 0,
} as const;
