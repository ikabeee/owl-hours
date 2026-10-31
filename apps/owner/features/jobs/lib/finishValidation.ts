import type { Money, MoneyRange } from "../../../shared/data/types.ts";
import { estimateCheck } from "./estimateCheck.ts";
import { finalTotal } from "./finalAmounts.ts";
import { isValidAmount } from "./lineValidation.ts";

export type FinishForm = { amounts: Money[]; estimate: MoneyRange; reason: string };

// "Mark as done" needs every final amount valid (the quote rules: positive whole numbers) and,
// when the total falls outside the estimate, a reason for the customer.
export function canMarkAsDone({ amounts, estimate, reason }: FinishForm): boolean {
  if (amounts.length === 0 || !amounts.every(isValidAmount)) return false;
  if (estimateCheck(finalTotal(amounts), estimate) === "within") return true;

  return reason.trim() !== "";
}
