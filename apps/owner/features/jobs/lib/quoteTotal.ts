import type { MoneyRange, QuoteLine } from "../../../shared/data/types.ts";
import { amountRange } from "./amountRange.ts";

// Same invariant as packages/shared quoteSchema: total min = sum of line minimums, total max = sum of line maximums.
export function quoteTotal(lines: QuoteLine[]): MoneyRange {
  return lines.reduce<MoneyRange>(
    (total, line) => {
      const { min, max } = amountRange(line.amount);
      return { min: total.min + min, max: total.max + max };
    },
    { min: 0, max: 0 },
  );
}
