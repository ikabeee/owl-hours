// The owner push-token endpoint over fetch: the upsert on registration and
// the delete on sign-out. Deps are injected so this runs without a device;
// pushTokenService wires the real fetch, session token and platform.
export type PushTokenApiDeps = {
  baseUrl: string;
  getSessionToken: () => Promise<string>;
  push: typeof fetch;
};

export async function postPushToken(
  deps: PushTokenApiDeps,
  expoToken: string,
  platform: "ios" | "android",
): Promise<void> {
  const sessionToken = await deps.getSessionToken();
  const response = await deps.push(`${deps.baseUrl}/v1/owner/push-tokens`, {
    method: "POST",
    headers: { authorization: `Bearer ${sessionToken}`, "content-type": "application/json" },
    body: JSON.stringify({ expoToken, platform }),
  });
  if (!response.ok) throw new Error(`Push token answered ${response.status}`);
}

export async function deletePushToken(
  deps: PushTokenApiDeps,
  expoToken: string,
): Promise<void> {
  const sessionToken = await deps.getSessionToken();
  const response = await deps.push(`${deps.baseUrl}/v1/owner/push-tokens`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${sessionToken}`, "content-type": "application/json" },
    body: JSON.stringify({ expoToken }),
  });
  if (!response.ok) throw new Error(`Push token delete answered ${response.status}`);
}
