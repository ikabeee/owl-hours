// Who is calling.
// * Owner app: "Authorization: Bearer <Supabase access token>". The token is
//   checked with Supabase Auth, and every query then runs as that user, so
//   row-level security decides what the business can see.
// * WhatsApp side: "x-zukki-key: <ZUKKI_SERVER_KEY>", compared in constant time.
import { createHash, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { MiddlewareHandler } from "hono";
import { HttpError } from "./respond.ts";

export type OwnerSession = { userId: string; db: SupabaseClient };
export type Authenticate = (accessToken: string) => Promise<OwnerSession | null>;
export type OwnerEnv = { Variables: { session: OwnerSession } };

const BEARER = /^Bearer ([A-Za-z0-9._~+/=-]{20,4096})$/;
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

export function requireOwner(authenticate: Authenticate): MiddlewareHandler<OwnerEnv> {
  return async (c, next) => {
    const token = BEARER.exec(c.req.header("authorization") ?? "")?.[1];
    if (!token) {
      throw new HttpError(401, "unauthorized", "Sign in to continue.");
    }
    const session = await authenticate(token);
    if (!session) {
      throw new HttpError(401, "unauthorized", "Your session has expired. Sign in again.");
    }
    c.set("session", session);
    await next();
  };
}

const digest = (value: string) => createHash("sha256").update(value).digest();

export function requireServerKey(expected: string): MiddlewareHandler {
  if (expected.length < 32) {
    throw new Error("server key must be at least 32 characters");
  }
  const expectedDigest = digest(expected);
  return async (c, next) => {
    const given = c.req.header("x-zukki-key");
    if (!given || !timingSafeEqual(digest(given), expectedDigest)) {
      throw new HttpError(401, "unauthorized", "Missing or wrong server key.");
    }
    await next();
  };
}

export function createSupabaseAuthenticator(config: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  fetch?: typeof fetch | undefined;
}): Authenticate {
  const global = config.fetch ? { fetch: config.fetch } : {};
  const authClient = createClient(config.supabaseUrl, config.supabaseAnonKey, { ...CLIENT_OPTIONS, global });
  return async (accessToken) => {
    const { data, error } = await authClient.auth.getUser(accessToken);
    if (error) {
      // An outage is not the caller's fault: surface it as a 500, not a sign-out.
      if ((error.status ?? 0) >= 500) {
        throw new Error(`Supabase Auth unavailable (${error.status})`);
      }
      return null;
    }
    if (!data.user) {
      return null;
    }
    const db = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      ...CLIENT_OPTIONS,
      global: { ...global, headers: { Authorization: `Bearer ${accessToken}` } },
    });
    return { userId: data.user.id, db };
  };
}
