'use dom';

import { VStack } from '@astryxdesign/core/Layout';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Text } from '@astryxdesign/core/Text';
import { TOTAL_SETUP_STEPS, stepLabel } from '../lib/setupSteps';

// Setup step header: "Step n of 3" with the progress bar. The total comes from lib.
export default function SetupStepHeader(props: { step: number }) {
  return (
    <VStack gap={2}>
      <Text type="supporting">{stepLabel(props.step)}</Text>
      <ProgressBar label={stepLabel(props.step)} isLabelHidden value={props.step} max={TOTAL_SETUP_STEPS} />
    </VStack>
  );
}
