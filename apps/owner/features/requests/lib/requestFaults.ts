import type { FaultLikelihood, PossibleFault, RequestOffer } from "../../../shared/data/types.ts";
import { sortLikelyFirst } from "./possibleFaults.ts";

const KNOWN_LIKELIHOODS: readonly string[] = ["likely", "possible"] satisfies FaultLikelihood[];

// The faults the request screen shows: none when Zukki sent none, likely first,
// and a likelihood the screen does not know yet is shown as "possible" rather than breaking it.
export function requestFaults(offer: Pick<RequestOffer, "possibleFaults">): PossibleFault[] {
  return sortLikelyFirst((offer.possibleFaults ?? []).map(withKnownLikelihood));
}

function withKnownLikelihood(fault: PossibleFault): PossibleFault {
  return KNOWN_LIKELIHOODS.includes(fault.likelihood) ? fault : { ...fault, likelihood: "possible" };
}
