import { Heading, Text } from '@astryxdesign/core/Text';
import { IconButton } from '@astryxdesign/core/IconButton';
import { ArrowLeft } from 'lucide-react';
import { contentCopys as copy } from '../copys/contentCopys.ts';

export type StoryPackHeaderProps = {
  showBack: boolean;
  backDisabled?: boolean;
  onBack: () => void;
};

export function StoryPackHeader({
  showBack,
  backDisabled = false,
  onBack,
}: StoryPackHeaderProps) {
  return (
    <header style={headerStyle}>
      {showBack && (
        <IconButton
          label={copy.backToPacks}
          icon={<ArrowLeft size={20} aria-hidden="true" />}
          variant="secondary"
          size="lg"
          isDisabled={backDisabled}
          style={iconButtonStyle}
          onClick={onBack}
        />
      )}
      <div style={headerTitleGroupStyle}>
        <div style={eyebrowStyle}>{copy.dayShift}</div>
        <Heading level={1}>{copy.title}</Heading>
        <Text type="supporting" style={subtitleStyle}>
          {copy.subtitle}
        </Text>
      </div>
      <div
        role="status"
        aria-label={copy.metaDisconnected}
        style={connectionChipStyle}
      >
        <span style={disconnectedDotStyle} aria-hidden="true" />
        <span>{copy.metaDisconnected}</span>
      </div>
    </header>
  );
}

const headerStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 12,
  minHeight: 76,
} as const;

const headerTitleGroupStyle = {
  minWidth: 0,
  flex: '1 1 240px',
} as const;

const iconButtonStyle = {
  width: 48,
  height: 48,
  minWidth: 48,
  minHeight: 48,
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  background: 'var(--color-background-card)',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
} as const;

const eyebrowStyle = {
  color: 'var(--color-accent)',
  fontSize: 16,
  fontWeight: 700,
  letterSpacing: '.09em',
  textTransform: 'uppercase',
  marginBottom: 4,
} as const;

const subtitleStyle = {
  fontSize: 16,
  lineHeight: 1.5,
} as const;

const connectionChipStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  borderRadius: 9999,
  padding: '8px 11px',
  fontSize: 16,
  fontWeight: 700,
  background: 'var(--color-background-muted)',
  color: 'var(--color-text-primary)',
  flexShrink: 0,
} as const;

const disconnectedDotStyle = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: 'var(--color-accent)',
} as const;
