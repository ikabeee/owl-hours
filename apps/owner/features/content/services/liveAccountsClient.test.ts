// Live AccountsClient over GET /v1/owner/linked-accounts, driven through createOwnerApi with a fake fetch.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createOwnerApi } from "../../../shared/infra/ownerApi.ts";
import { createLiveAccountsClient } from "./liveAccountsClient.ts";

const API = "https://api.example.com";

function fakeAccountsApi(answer: Response) {
  const calls: string[] = [];
  const fetch = (async (url: string, init: RequestInit) => {
    calls.push(`${init.method ?? "GET"} ${url}`);
    return answer.clone();
  }) as unknown as typeof globalThis.fetch;
  const api = createOwnerApi({ apiUrl: API, getAccessToken: async () => "tok", fetch });
  return { client: createLiveAccountsClient(api), calls };
}

describe("live accounts client", () => {
  it("lists each linked account from the API as connected, named by its display name", async () => {
    const { client, calls } = fakeAccountsApi(Response.json({
      success: true,
      data: [
        { id: "a0000000-0000-4000-8000-000000000001", platform: "facebook_page", displayName: "Northside Plumbing", mode: "live" },
        { id: "a0000000-0000-4000-8000-000000000002", platform: "instagram", displayName: null, mode: "test" },
      ],
    }));

    assert.deepEqual(await client.listAccounts(), [
      { kind: "facebook_page", name: "Northside Plumbing", status: "connected" },
      { kind: "instagram", name: "", status: "connected" },
    ]);
    assert.deepEqual(calls, [`GET ${API}/v1/owner/linked-accounts`]);
  });

  it("answers an empty list when nothing is linked", async () => {
    const { client } = fakeAccountsApi(Response.json({ success: true, data: [] }));

    assert.deepEqual(await client.listAccounts(), []);
  });

  it("rejects when the API fails, never a silent list", async () => {
    const { client } = fakeAccountsApi(
      Response.json({ success: false, error: { code: "internal", message: "Boom." } }, { status: 500 }),
    );

    await assert.rejects(client.listAccounts(), /Boom/);
  });

  it("rejects an answer that is not a list of accounts", async () => {
    const { client } = fakeAccountsApi(Response.json({ success: true, data: [{ platform: "tiktok" }] }));

    await assert.rejects(client.listAccounts());
  });
});
