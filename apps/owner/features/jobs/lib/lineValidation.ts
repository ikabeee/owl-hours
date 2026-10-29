import type { Money, MoneyRange, QuoteLine } from "../../../shared/data/types.ts";
import { amountRange } from "./amountRange.ts";

// Positive whole numbers, and min <= max for a range (HANDOFF-RN-UI.md section 8, Quote).
export function isValidAmount(amount: Money | MoneyRange): boolean {
  const { min, max } = amountRange(amount);
  return isPositiveWholeNumber(min) && isPositiveWholeNumber(max) && min <= max;
}

// "Send quote" is enabled only when there is at least one line and every line is valid.
export function canSendQuote(lines: QuoteLine[]): boolean {
  return lines.length > 0 && lines.every((line) => isValidAmount(line.amount));
}

function isPositiveWholeNumber(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}
