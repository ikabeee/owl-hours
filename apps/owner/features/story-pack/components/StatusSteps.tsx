import { Check } from 'lucide-react';
import type { StoryPack } from '../lib/storyPack.ts';
import { contentCopys as copy } from '../copys/contentCopys.ts';

export type StatusStepsProps = {
  status: StoryPack['status'];
};

export function StatusSteps({ status }: StatusStepsProps) {
  const activeIndex = getActiveStepIndex(status);
  const steps = [
    copy.draft,
    status === 'rejected' ? copy.rejected : copy.ownerReviewStep,
    copy.manualHandoffStep,
    copy.published,
  ];

  return (
    <ol aria-label={copy.statusStepsLabel} style={stepsStyle}>
      {steps.map((step, index) => {
        const isCurrent = index === activeIndex;
        const isComplete = index < activeIndex;

        return (
          <li
            key={step}
            aria-current={isCurrent ? 'step' : undefined}
            style={isCurrent ? activeStepStyle : stepStyle}
          >
            <span style={stepNumberStyle}>
              {isComplete ? <Check size={13} aria-hidden="true" /> : index + 1}
            </span>
            <span>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}

function getActiveStepIndex(status: StoryPack['status']): number {
  if (status === 'draft') return 0;
  if (status === 'approved' || status === 'rejected') return 1;
  return 3;
}

const stepsStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  listStyle: 'none',
  padding: 0,
  margin: 0,
  gap: 6,
} as const;

// Steps are neutral: the current one reads by weight, never by accent or success color.
const stepStyle = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  gap: 6,
  fontSize: 16,
  lineHeight: 1.2,
  padding: '8px 2px',
  color: 'var(--color-text-secondary)',
  fontWeight: 400,
} as const;

const activeStepStyle = {
  ...stepStyle,
  color: 'var(--color-text-primary)',
  fontWeight: 800,
} as const;

const stepNumberStyle = {
  width: 24,
  height: 24,
  display: 'grid',
  placeItems: 'center',
  borderRadius: 9999,
  border: '1px solid currentColor',
  fontSize: 16,
  fontWeight: 800,
} as const;
