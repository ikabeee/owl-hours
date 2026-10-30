import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Check } from 'lucide-react';
import type { StoryPack, StorySource } from '../lib/storyPack.ts';
import { contentCopys as copy } from '../copys/contentCopys.ts';

export type SourceCardProps = {
  primary: boolean;
  source: StorySource;
  onCreate: (jobId: string) => Promise<StoryPack | null>;
};

export function SourceCard({ primary, source, onCreate }: SourceCardProps) {
  return (
    <Card padding={4}>
      <VStack gap={3}>
        <div style={sourceHeadingStyle}>
          <div style={completedIconStyle} aria-hidden="true">
            <Check size={18} />
          </div>
          <div style={sourceTextStyle}>
            <Text type="label">{source.jobTitle}</Text>
            <Text type="supporting" style={sourceSubtitleStyle}>
              {source.businessName}
            </Text>
          </div>
        </div>
        <div style={sourceMetaStyle}>
          <span style={consentChipStyle}>
            <Check size={14} aria-hidden="true" />
            {source.isDemo ? copy.demoConsent : copy.currentConsent}
          </span>
          <span style={demoVisualPillStyle}>
            {source.isDemo
              ? copy.demoVisualCount(source.assets.length)
              : copy.sourcePhotoCount(source.assets.length)}
          </span>
        </div>
        <div style={sourceActionsStyle}>
          <span style={sourceDataNoteStyle}>{copy.sourceStatus}</span>
          <Button
            label={copy.create}
            variant={primary ? 'primary' : 'secondary'}
            size="lg"
            style={createButtonStyle}
            onClick={() => {
              void onCreate(source.id);
            }}
          />
        </div>
      </VStack>
    </Card>
  );
}

const sourceHeadingStyle = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
} as const;

const completedIconStyle = {
  width: 36,
  height: 36,
  borderRadius: 12,
  display: 'grid',
  placeItems: 'center',
  background: 'var(--color-background-muted)',
  color: 'var(--color-success)',
  flexShrink: 0,
} as const;

const sourceTextStyle = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
} as const;

const sourceSubtitleStyle = {
  fontSize: 16,
  lineHeight: 1.5,
} as const;

const sourceMetaStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 7,
  alignItems: 'center',
} as const;

const consentChipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  borderRadius: 9999,
  background: 'var(--color-background-muted)',
  color: 'var(--color-success)',
  padding: '5px 8px',
  fontSize: 16,
  fontWeight: 600,
} as const;

const demoVisualPillStyle = {
  borderRadius: 9999,
  background: 'var(--color-background-muted)',
  color: 'var(--color-text-secondary)',
  padding: '5px 8px',
  fontSize: 16,
} as const;

const sourceActionsStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: 8,
} as const;

const sourceDataNoteStyle = {
  color: 'var(--color-text-secondary)',
  fontSize: 16,
} as const;

const createButtonStyle = {
  minHeight: 48,
} as const;
