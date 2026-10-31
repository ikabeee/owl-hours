import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Badge } from '@astryxdesign/core/Badge';
import { ChevronRight } from 'lucide-react';
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
      <SourcesSection sources={sources} onCreate={onCreate} />
      <Divider />
      <PacksSection packs={packs} onSelect={onSelect} />
    </VStack>
  );
}

function SourcesSection({ sources, onCreate }: Pick<OverviewProps, 'sources' | 'onCreate'>) {
  return (
    <VStack gap={3} as="section">
      <VStack gap={1}>
        <Heading level={2}>{copy.sourceTitle}</Heading>
        <Text type="supporting">{copy.sourceDescription}</Text>
        <HStack gap={2} align="center">
          <StatusDot variant="success" label={copy.eligible} aria-hidden="true" />
          <Text>{copy.eligible}</Text>
        </HStack>
      </VStack>
      {sources.length === 0 ? (
        <EmptyState
          title={copy.emptyTitle}
          description={copy.noSources}
          icon={<Owl src={owlIdle} scale={0.6} clip alt="" />}
        />
      ) : (
        <div style={sourceGridStyle}>
          {sources.map((source) => (
            <SourceCard key={source.id} source={source} onCreate={onCreate} />
          ))}
        </div>
      )}
    </VStack>
  );
}

function PacksSection({ packs, onSelect }: Pick<OverviewProps, 'packs' | 'onSelect'>) {
  return (
    <VStack gap={3} as="section">
      <HStack gap={3} align="center">
        {packs.length > 0 && <Owl src={owlReview} scale={0.36} clip alt="" />}
        <VStack gap={1} className="zukki-grow">
          <Heading level={2}>{copy.packsTitle}</Heading>
          <Text type="supporting">{copy.draftFlowSummary}</Text>
        </VStack>
        {packs.length > 0 && <Badge variant="neutral" label={String(packs.length)} />}
      </HStack>
      {packs.length === 0 ? (
        <EmptyState
          title={copy.noPacks}
          icon={<Owl src={owlIdle} scale={0.6} clip alt="" />}
        />
      ) : (
        packs.map((pack) => (
          <PackRow key={pack.id} pack={pack} onSelect={onSelect} />
        ))
      )}
    </VStack>
  );
}

function PackRow({ pack, onSelect }: { pack: StoryPack; onSelect: (id: string) => void }) {
  const status = storyPackStatusLabel(pack.status);
  return (
    <ClickableCard
      label={copy.packRowLabel(pack.jobTitle, status)}
      padding={3}
      onClick={() => onSelect(pack.id)}
    >
      <HStack gap={3} align="center">
        <VStack gap={1} className="zukki-grow">
          <Text type="label">{pack.jobTitle}</Text>
          <Text type="supporting">{copy.packMeta(pack.businessName, pack.isDemo)}</Text>
          <Text>{status}</Text>
        </VStack>
        <ChevronRight size={18} aria-hidden="true" />
      </HStack>
    </ClickableCard>
  );
}

const sourceGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
  gap: 12,
} as const;
