import type { Money, MoneyRange } from "../data/types.ts";

// "$130–160" for a range, "$45" when min = max.
export function moneyRangeText({ min, max }: MoneyRange): string {
  return min === max ? `$${min}` : `$${min}–${max}`;
}

// A single amount reads "$45", a range reads "$60–90".
export function amountText(amount: Money | MoneyRange): string {
  return typeof amount === "number" ? `$${amount}` : moneyRangeText(amount);
}
