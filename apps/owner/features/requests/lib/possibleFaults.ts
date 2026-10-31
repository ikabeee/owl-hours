import type { FaultLikelihood, PossibleFault } from "../../../shared/data/types.ts";

const likelihoodRank: Record<FaultLikelihood, number> = { likely: 0, possible: 1 };

// Likely faults first; faults of the same likelihood keep Zukki's order.
export function sortLikelyFirst(faults: readonly PossibleFault[]): PossibleFault[] {
  return [...faults].sort((a, b) => likelihoodRank[a.likelihood] - likelihoodRank[b.likelihood]);
}
