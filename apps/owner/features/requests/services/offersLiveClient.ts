import type { DeclineReason, ID } from "../../../shared/data/types.ts";

// The live offers client: the demo fake covers demo mode, this one covers live
// mode, posting the chosen decline reason to the owner API as the signed-in owner.
export type OffersLiveClientDeps = {
  baseUrl: string;
  getToken: () => Promise<string>;
  push: typeof fetch;
};

export type OffersLiveClient = {
  declineOffer(id: ID, reason: DeclineReason): Promise<void>;
};

export function createOffersLiveClient(deps: OffersLiveClientDeps): OffersLiveClient {
  return {
    declineOffer: (id, reason) => postDecline(deps, id, reason),
  };
}

async function postDecline(deps: OffersLiveClientDeps, id: ID, reason: DeclineReason): Promise<void> {
  const token = await deps.getToken();
  const response = await deps.push(`${deps.baseUrl}/v1/owner/offers/${id}/decline`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) throw new Error(`Decline answered ${response.status}`);
}
