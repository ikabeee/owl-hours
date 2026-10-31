import { VStack } from '@astryxdesign/core/Layout';
import { Card } from '@astryxdesign/core/Card';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Divider } from '@astryxdesign/core/Divider';
import { Check, ChevronRight } from 'lucide-react';
import { Owl } from '../../../shared/mascot/Owl';
import owlReview from '../../../shared/mascot/owl/review';
import owlIdle from '../../../shared/mascot/owl/idle';
import { SourceCard } from './SourceCard.tsx';
import {
  storyPackStatusLabel,
  type StoryPack,
  type StorySource,
} from '../lib/storyPack.ts';
import { contentCopys as copy } from '../copys/contentCopys.ts';

export type OverviewProps = {
  sources: StorySource[];
  packs: StoryPack[];
  onCreate: (jobId: string) => Promise<StoryPack | null>;
  onSelect: (id: string) => void;
};

export function Overview({ sources, packs, onCreate, onSelect }: OverviewProps) {
  return (
    <VStack gap={4}>
      <section>
        <div style={sectionHeaderStyle}>
          <div>
            <Heading level={2}>{copy.sourceTitle}</Heading>
            <Text type="supporting" style={sectionDescriptionStyle}>
              {copy.sourceDescription}
            </Text>
          </div>
          <span style={eligibleChipStyle}>
            <Check size={15} aria-hidden="true" />
            {copy.eligible}
          </span>
        </div>
        {sources.length === 0 ? (
          <Card padding={4}>
            <VStack gap={2}>
              <Heading level={2}>{copy.emptyTitle}</Heading>
              <Text>{copy.noSources}</Text>
            </VStack>
          </Card>
        ) : (
          <div style={sourceGridStyle}>
            {sources.map((source, index) => (
              <SourceCard
                key={source.id}
                source={source}
                primary={index === 0}
                onCreate={onCreate}
              />
            ))}
          </div>
        )}
      </section>

      <Divider />

      <section>
        <div style={sectionHeaderStyle}>
          <div style={mascotHeadingStyle}>
            {packs.length > 0 && (
              <Owl src={owlReview} scale={0.36} clip alt="" />
            )}
            <div>
              <Heading level={2}>{copy.packsTitle}</Heading>
              <Text type="supporting" style={sectionDescriptionStyle}>
                {copy.draftFlowSummary}
              </Text>
            </div>
          </div>
          {packs.length > 0 && (
            <span style={countChipStyle}>{packs.length}</span>
          )}
        </div>
        {packs.length === 0 ? (
          <div style={emptyListStyle}>
            <Owl src={owlIdle} scale={0.6} clip alt="" />
            <p style={emptyListTextStyle}>{copy.noPacks}</p>
          </div>
        ) : (
          <div style={packListStyle}>
            {packs.map((pack) => (
              <button
                key={pack.id}
                type="button"
                aria-label={`${pack.jobTitle} - ${storyPackStatusLabel(pack.status)}`}
                style={packRowStyle}
                onClick={() => onSelect(pack.id)}
              >
                <div style={packInfoStyle}>
                  <strong>{pack.jobTitle}</strong>
                  <span style={packMetaStyle}>
                    {pack.isDemo ? copy.demoMarker : ''}
                    {pack.businessName}
                  </span>
                </div>
                <span style={statusBadgeStyle}>
                  {storyPackStatusLabel(pack.status)}
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </section>
    </VStack>
  );
}

const sectionHeaderStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  alignItems: 'end',
  gap: 12,
  marginBottom: 12,
} as const;

const sectionDescriptionStyle = {
  fontSize: 16,
  lineHeight: 1.5,
} as const;

const eligibleChipStyle = {
  borderRadius: 9999,
  background: 'var(--color-background-muted)',
  color: 'var(--color-success)',
  padding: '7px 10px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 16,
  fontWeight: 700,
  flexShrink: 0,
} as const;

const sourceGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
  gap: 12,
} as const;

const mascotHeadingStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 0,
} as const;

const countChipStyle = {
  minWidth: 28,
  height: 28,
  borderRadius: 9999,
  display: 'grid',
  placeItems: 'center',
  background: 'var(--color-background-muted)',
  fontSize: 16,
  fontWeight: 700,
} as const;

const emptyListStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 16,
  color: 'var(--color-text-secondary)',
  border: '1px dashed var(--color-border-emphasized)',
  borderRadius: 12,
} as const;

const emptyListTextStyle = {
  margin: 0,
  fontSize: 16,
} as const;

const packListStyle = {
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  overflow: 'hidden',
  background: 'var(--color-background-card)',
} as const;

const packRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minHeight: 64,
  padding: '8px 12px',
  border: 0,
  borderBottom: '1px solid var(--color-border)',
  background: 'transparent',
  cursor: 'pointer',
  font: 'inherit',
} as const;

const packInfoStyle = {
  flex: 1,
  minWidth: 0,
  textAlign: 'left',
} as const;

const packMetaStyle = {
  display: 'block',
  marginTop: 3,
  color: 'var(--color-text-secondary)',
  fontSize: 16,
} as const;

const statusBadgeStyle = {
  borderRadius: 9999,
  padding: '6px 9px',
  background: 'var(--color-background-muted)',
  color: 'var(--color-text-primary)',
  fontSize: 16,
  fontWeight: 700,
  flexShrink: 0,
} as const;
