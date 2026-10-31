import type React from 'react';
import { Button } from '@astryxdesign/core/Button';
import { contentCopys as copy } from '../copys/contentCopys.ts';

export type TargetToggleProps = {
  label: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
};

export function TargetToggle({
  label,
  selected,
  disabled,
  onClick,
  icon,
}: TargetToggleProps) {
  return (
    <Button
      label={label}
      variant="secondary"
      aria-pressed={selected}
      isDisabled={disabled}
      onClick={() => {
        if (!disabled) {
          onClick();
        }
      }}
      icon={icon}
      endContent={
        <span style={targetStateStyle}>
          {selected ? copy.included : copy.notIncluded}
        </span>
      }
      style={selected ? selectedTargetStyle : defaultTargetStyle}
    />
  );
}

const targetBaseStyle = {
  minHeight: 58,
  display: 'grid',
  gridTemplateColumns: '24px 1fr auto',
  gap: 8,
  alignItems: 'center',
  textAlign: 'left',
  padding: '8px 12px',
  borderRadius: 12,
  cursor: 'pointer',
  fontSize: 16,
} as const;

const defaultTargetStyle = {
  ...targetBaseStyle,
  border: '1px solid var(--color-border)',
  background: 'var(--color-background-card)',
  color: 'var(--color-text-primary)',
} as const;

const selectedTargetStyle = {
  ...targetBaseStyle,
  border: '1px solid var(--color-accent)',
  background: 'var(--color-background-muted)',
  color: 'var(--color-text-primary)',
} as const;

const targetStateStyle = {
  fontSize: 16,
  color: 'var(--color-text-secondary)',
  fontWeight: 600,
} as const;
