// Spec: odd/tasks/owner-notification-test-zukki.md T1 (S1). The live offers client
// sends the chosen decline reason to the owner API. The fake client covers the demo;
// this client covers live mode, with fetch and the session token injected.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createOffersLiveClient } from "./offersLiveClient.ts";

function recordingFetch() {
  const calls: { url: string; init: RequestInit }[] = [];
  const push = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return Response.json({ success: true, data: {} });
  }) as typeof fetch;
  return { calls, push };
}

describe("offersLiveClient.declineOffer", () => {
  it("posts the chosen reason to POST /offers/:id/decline as the signed-in owner", async () => {
    const { calls, push } = recordingFetch();
    const sessionToken = "session-token-for-tests";
    const client = createOffersLiveClient({
      baseUrl: "https://api.example",
      getToken: async () => sessionToken,
      push,
    });

    await client.declineOffer("req_ana", "too_far");

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, "https://api.example/v1/owner/offers/req_ana/decline");
    assert.equal(calls[0]?.init.method, "POST");
    const headers = (calls[0]?.init.headers ?? {}) as Record<string, string>;
    assert.equal(headers["authorization"], `Bearer ${sessionToken}`);
    assert.equal(headers["content-type"], "application/json");
    assert.deepEqual(JSON.parse(String(calls[0]?.init.body)), { reason: "too_far" });
  });
});
