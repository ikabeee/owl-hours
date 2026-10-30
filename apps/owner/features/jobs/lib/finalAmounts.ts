import type { Money, MoneyRange, QuoteLine } from "../../../shared/data/types.ts";
import { amountRange } from "./amountRange.ts";

// The finish form opens with the design's values: a single-amount line keeps its amount,
// a range line starts at the middle of its range, rounded down.
export function initialFinalAmounts(lines: QuoteLine[]): Money[] {
  return lines.map((line) => midpointDown(amountRange(line.amount)));
}

// The final total is the sum of the final amounts, recalculated live as the owner edits.
export function finalTotal(amounts: Money[]): Money {
  return amounts.reduce((total, amount) => total + amount, 0);
}

function midpointDown({ min, max }: MoneyRange): Money {
  return Math.floor((min + max) / 2);
}
