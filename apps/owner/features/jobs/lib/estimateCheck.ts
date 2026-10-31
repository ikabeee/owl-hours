import type { Money, MoneyRange } from "../../../shared/data/types.ts";

export type EstimatePosition = "within" | "below" | "above";

// Where the final total lands against the quoted estimate, both bounds included.
export function estimateCheck(total: Money, estimate: MoneyRange): EstimatePosition {
  if (total < estimate.min) return "below";
  if (total > estimate.max) return "above";

  return "within";
}
