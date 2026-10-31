import type { Money, MoneyRange } from "../../../shared/data/types.ts";

// A single amount counts as a range whose ends are equal.
export function amountRange(amount: Money | MoneyRange): MoneyRange {
  return typeof amount === "number" ? { min: amount, max: amount } : amount;
}
