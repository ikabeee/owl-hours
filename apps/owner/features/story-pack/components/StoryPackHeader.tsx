import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { IconButton } from '@astryxdesign/core/IconButton';
import { StatusDot } from '@astryxdesign/core/StatusDot';
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
    <VStack gap={2}>
      <HStack gap={3} align="center">
        {showBack && (
          <IconButton
            label={copy.backToPacks}
            icon={<ArrowLeft size={20} aria-hidden="true" />}
            variant="secondary"
            size="lg"
            isDisabled={backDisabled}
            onClick={onBack}
          />
        )}
        <VStack gap={1} className="zukki-grow">
          <Heading level={1}>{copy.title}</Heading>
          <Text type="supporting">{copy.subtitle}</Text>
        </VStack>
      </HStack>
      <HStack gap={2} align="center">
        <StatusDot variant="neutral" label={copy.metaDisconnected} aria-hidden="true" />
        <Text type="supporting" role="status">{copy.metaDisconnected}</Text>
      </HStack>
    </VStack>
  );
}
