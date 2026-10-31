import { VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { contentCopys as copy } from '../copys/contentCopys.ts';

export function DemoBanner() {
  return (
    <VStack gap={1} role="status" aria-label={copy.demoTitle}>
      <Text type="label">{copy.demoTitle}</Text>
      <Text type="supporting">{copy.demoNotice}</Text>
    </VStack>
  );
}
