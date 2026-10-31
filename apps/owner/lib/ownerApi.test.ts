// The live owner API client: bearer token on every call, the { success, data } envelope unwrapped,
// and failures carrying the API's error code.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OwnerApiError, createOwnerApi } from "./ownerApi.ts";

function respond(status: number, body: unknown) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchStub = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  return { calls, api: createOwnerApi({ baseUrl: "https://api.test/", getToken: async () => "tok", fetch: fetchStub }) };
}

describe("ownerApi", () => {
  it("sends the session token and returns the data", async () => {
    const { calls, api } = respond(200, { success: true, data: [{ id: "a" }] });
    assert.deepEqual(await api.get("/offers"), [{ id: "a" }]);
    assert.equal(calls[0]?.url, "https://api.test/v1/owner/offers");
    assert.equal((calls[0]?.init.headers as Record<string, string>).authorization, "Bearer tok");
  });

  it("posts JSON bodies", async () => {
    const { calls, api } = respond(201, { success: true, data: { id: "m1" } });
    await api.post("/conversations/c1/messages", { text: "hi" });
    assert.equal(calls[0]?.init.method, "POST");
    assert.equal(calls[0]?.init.body, JSON.stringify({ text: "hi" }));
  });

  it("throws the API's error code", async () => {
    const { api } = respond(409, { success: false, error: { code: "offer_expired", message: "Too late." } });
    await assert.rejects(api.post("/offers/x/accept"), (error: unknown) => {
      assert.ok(error instanceof OwnerApiError);
      assert.equal(error.status, 409);
      assert.equal(error.code, "offer_expired");
      return true;
    });
  });
});
