import type { Money, MoneyRange, Quote, QuoteLine } from "../../../shared/data/types.ts";
import { quoteTotal } from "./quoteTotal.ts";

// The quote modal edits the lines it was opened with; these keep that logic pure.
export function withLineAmount(lines: QuoteLine[], index: number, amount: Money | MoneyRange): QuoteLine[] {
  return lines.map((line, position) => (position === index ? { ...line, amount } : line));
}

// The total is always recomputed from the lines, never carried over from the draft.
export function buildQuote(base: Quote, lines: QuoteLine[]): Quote {
  return { ...base, lines, total: quoteTotal(lines) };
}
