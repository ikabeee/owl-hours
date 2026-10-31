// A scripted owner API for the live-service tests: each "METHOD /path" answers a fixed value or a function.
import { OwnerApiError } from "./ownerApi.ts";
import type { OwnerApi } from "./ownerApi.ts";

export type FakeRoute = unknown | ((body: unknown) => unknown);

export function createFakeOwnerApi(routes: Record<string, FakeRoute>) {
  const calls: Array<{ method: string; path: string; body?: unknown }> = [];

  async function call(method: string, path: string, body?: unknown) {
    calls.push(body === undefined ? { method, path } : { method, path, body });
    const key = `${method} ${path}`;
    if (!(key in routes)) throw new OwnerApiError(404, "not_found", `${key} is not scripted`);
    const route = routes[key];
    return typeof route === "function" ? (route as (body: unknown) => unknown)(body) : structuredClone(route);
  }

  const api: OwnerApi = {
    get: async <T>(path: string) => (await call("GET", path)) as T,
    post: async <T>(path: string, body?: unknown) => (await call("POST", path, body ?? {})) as T,
  };
  return { api, calls };
}
