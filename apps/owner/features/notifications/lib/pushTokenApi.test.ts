// Spec: odd/tasks/owner-notification-test-zukki.md T4 (S11). The app deletes
// this device's token for the signed-in user through DELETE
// /v1/owner/push-tokens on sign-out. Deps are injected so this runs without a
// device; pushTokenService wires the real fetch, session token and platform.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deletePushToken, postPushToken } from "./pushTokenApi.ts";

function recordingPush(answer: unknown, status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  const push = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return Response.json(answer, { status });
  }) as typeof fetch;
  return { calls, push };
}

const depsOf = (push: typeof fetch) => ({
  baseUrl: "https://api.test",
  getSessionToken: async () => "session-token",
  push,
});

describe("pushTokenApi", () => {
  it("deletes the device token for the signed-in owner", async () => {
    const { calls, push } = recordingPush({ expoToken: "ExponentPushToken[abc123]" });

    await deletePushToken(depsOf(push), "ExponentPushToken[abc123]");

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, "https://api.test/v1/owner/push-tokens");
    assert.equal(calls[0]?.init.method, "DELETE");
    assert.equal(new Headers(calls[0]?.init.headers).get("authorization"), "Bearer session-token");
    assert.deepEqual(JSON.parse(String(calls[0]?.init.body)), { expoToken: "ExponentPushToken[abc123]" });
  });

  it("a failed delete throws, so the caller decides whether sign-out continues", async () => {
    const { push } = recordingPush({ error: "gone" }, 500);

    await assert.rejects(deletePushToken(depsOf(push), "ExponentPushToken[abc123]"), /500/);
  });

  it("posts the token with its platform on registration", async () => {
    const { calls, push } = recordingPush({ expoToken: "ExponentPushToken[abc123]", platform: "ios" });

    await postPushToken(depsOf(push), "ExponentPushToken[abc123]", "ios");

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.init.method, "POST");
    assert.deepEqual(JSON.parse(String(calls[0]?.init.body)), {
      expoToken: "ExponentPushToken[abc123]",
      platform: "ios",
    });
  });
});
