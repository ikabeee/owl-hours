import { VStack } from '@astryxdesign/core/Layout';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { contentCopys as copy } from '../copys/contentCopys.ts';

// Astryx Skeleton fades (no shimmer) and waits 1 s before animating, so fast loads stay still.
export function Loading() {
  return (
    <VStack gap={3} role="status" aria-label={copy.loading}>
      <Skeleton height={28} width="60%" index={0} />
      <Skeleton height={120} index={1} />
      <Skeleton height={120} index={2} />
    </VStack>
  );
}
