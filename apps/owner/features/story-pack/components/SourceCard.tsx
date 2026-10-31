import { Card } from '@astryxdesign/core/Card';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Button } from '@astryxdesign/core/Button';
import type { StoryPack, StorySource } from '../lib/storyPack.ts';
import { contentCopys as copy } from '../copys/contentCopys.ts';

export type SourceCardProps = {
  source: StorySource;
  onCreate: (jobId: string) => Promise<StoryPack | null>;
};

export function SourceCard({ source, onCreate }: SourceCardProps) {
  const consent = source.isDemo ? copy.demoConsent : copy.currentConsent;
  const photoCount = source.isDemo
    ? copy.demoVisualCount(source.assets.length)
    : copy.sourcePhotoCount(source.assets.length);

  return (
    <Card padding={4}>
      <VStack gap={3}>
        <VStack gap={1}>
          <Text type="label">{source.jobTitle}</Text>
          <Text type="supporting">{source.businessName}</Text>
        </VStack>
        <HStack gap={2} align="center">
          <StatusDot variant="success" label={consent} aria-hidden="true" />
          <Text>{consent}</Text>
        </HStack>
        <Text type="supporting">{photoCount}</Text>
        <Text type="supporting">{copy.sourceStatus}</Text>
        {/* Secondary: the screen's single primary action lives in the bottom bar. */}
        <Button
          label={copy.create}
          variant="secondary"
          size="lg"
          onClick={() => {
            void onCreate(source.id);
          }}
        />
      </VStack>
    </Card>
  );
}
