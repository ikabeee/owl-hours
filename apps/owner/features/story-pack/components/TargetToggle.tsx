import type React from 'react';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';

export type TargetToggleProps = {
  label: string;
  selected: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
  icon: React.ReactNode;
};

export function TargetToggle({
  label,
  selected,
  disabled,
  onChange,
  icon,
}: TargetToggleProps) {
  return (
    <CheckboxInput
      label={label}
      labelIcon={icon}
      value={selected}
      isDisabled={disabled}
      onChange={(checked) => onChange(checked)}
    />
  );
}
