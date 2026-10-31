// Live mode is on when the build has the Supabase and API variables: the screens then read the owner
// API as the signed-in owner. Without them this answers null and every screen keeps its demo data.
import { getOwnerAuthRuntime } from "../features/auth/services/ownerAuthRuntime";
import { API_BASE_URL } from "./api-client";
import { createOwnerApi } from "./ownerApi.ts";
import type { OwnerApi } from "./ownerApi.ts";

export type LiveOwnerAuth = { baseUrl: string; getToken: () => Promise<string> };

let api: OwnerApi | null | undefined;

// The API address and the signed-in owner's token, for clients that call the API themselves.
export function liveOwnerAuth(): LiveOwnerAuth | null {
  const runtime = getOwnerAuthRuntime();
  if (!runtime || !process.env.EXPO_PUBLIC_API_URL) return null;
  return { baseUrl: API_BASE_URL, getToken: () => runtime.getAccessToken() };
}

export function liveOwnerApi(): OwnerApi | null {
  if (api !== undefined) return api;
  const auth = liveOwnerAuth();
  api = auth ? createOwnerApi({ ...auth, fetch: (input, init) => fetch(input, init) }) : null;
  return api;
}
