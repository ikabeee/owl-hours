import { HStack } from '@astryxdesign/core/Layout';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Text } from '@astryxdesign/core/Text';
import type { Money, MoneyRange, QuoteLine } from '../../../shared/data/types.ts';
import { jobsCopys } from '../copys/jobsCopys';
import { isValidAmount } from '../lib/lineValidation.ts';
import './jobsScreen.css';

// One editable quote line: its label and one amount field, or two (min, max) for a range.
export function QuoteLineFields(props: { line: QuoteLine; onChange: (amount: Money | MoneyRange) => void }) {
  const { line } = props;
  const isInvalid = !isValidAmount(line.amount);

  return (
    <div className="zukki-quote-line">
      <Text>{line.label}</Text>
      {typeof line.amount === 'number' ? (
        <AmountField label={line.label} amount={line.amount} isInvalid={isInvalid} onChange={props.onChange} />
      ) : (
        <RangeFields label={line.label} range={line.amount} isInvalid={isInvalid} onChange={props.onChange} />
      )}
    </div>
  );
}

function RangeFields(props: { label: string; range: MoneyRange; isInvalid: boolean; onChange: (range: MoneyRange) => void }) {
  const { range } = props;
  return (
    <HStack gap={1} align="center">
      <AmountField
        label={`${props.label} ${jobsCopys.minimum}`}
        amount={range.min}
        isInvalid={props.isInvalid}
        onChange={(min) => props.onChange({ ...range, min })}
      />
      <Text aria-hidden>–</Text>
      <AmountField
        label={`${props.label} ${jobsCopys.maximum}`}
        amount={range.max}
        isInvalid={props.isInvalid}
        onChange={(max) => props.onChange({ ...range, max })}
      />
    </HStack>
  );
}

const INVALID_STATUS = { type: 'error' } as const;

// An emptied field is NaN: it stays in the lines, is invalid, and keeps "Send quote" disabled.
// Shared with the finish screen, whose final amounts are the same control.
export function AmountField(props: { label: string; amount: Money; isInvalid: boolean; onChange: (amount: Money) => void }) {
  return (
    <NumberInput
      label={props.label}
      isLabelHidden
      size="lg"
      width={104}
      isIntegerOnly
      hasClear
      {...(props.isInvalid && { status: INVALID_STATUS })}
      value={Number.isNaN(props.amount) ? null : props.amount}
      formatValue={(value) => `$${value}`}
      onChange={(value) => props.onChange(value ?? Number.NaN)}
    />
  );
}
