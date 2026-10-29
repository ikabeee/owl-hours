import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import type { FaultLikelihood, PossibleFault } from '../../../shared/data/types';
import { requestsCopys } from '../copys/requestsCopys';

const likelihoodBadge: Record<FaultLikelihood, { label: string; variant: 'warning' | 'neutral' }> = {
  likely: { label: requestsCopys.likelihoodLikely, variant: 'warning' },
  possible: { label: requestsCopys.likelihoodPossible, variant: 'neutral' },
};

// Expects the faults already ordered (likely first); renders nothing when Zukki could not diagnose.
export function PossibleFaults({ faults }: { faults: PossibleFault[] }) {
  if (faults.length === 0) return null;

  return (
    <VStack gap={2}>
      <Text type="label">{requestsCopys.possibleFaultsHeading}</Text>
      {faults.map((fault) => (
        <HStack key={fault.label} justify="between" align="center" gap={2}>
          <Text>{fault.label}</Text>
          <Badge label={likelihoodBadge[fault.likelihood].label} variant={likelihoodBadge[fault.likelihood].variant} />
        </HStack>
      ))}
    </VStack>
  );
}
