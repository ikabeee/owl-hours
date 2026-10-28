// Fixed-window rate limit kept in memory. Enough for one API instance; with
// several instances, move the counters to a shared store.
import type { Context, Env, MiddlewareHandler } from "hono";
import { HttpError } from "./respond.ts";

export type RateLimitOptions<E extends Env> = {
  limit: number;
  windowMs: number;
  key: (c: Context<E>) => string;
  now?: (() => number) | undefined;
};

const MAX_TRACKED_KEYS = 10_000;

export function rateLimit<E extends Env>(options: RateLimitOptions<E>): MiddlewareHandler<E> {
  const windows = new Map<string, { count: number; resetAt: number }>();
  const now = options.now ?? Date.now;

  return async (c, next) => {
    const at = now();
    if (windows.size > MAX_TRACKED_KEYS) {
      for (const [key, window] of windows) {
        if (window.resetAt <= at) {
          windows.delete(key);
        }
      }
    }
    const key = options.key(c);
    const current = windows.get(key);
    const window = current && current.resetAt > at ? current : { count: 0, resetAt: at + options.windowMs };
    const next_ = { count: window.count + 1, resetAt: window.resetAt };
    windows.set(key, next_);
    if (next_.count > options.limit) {
      c.header("Retry-After", String(Math.max(1, Math.ceil((next_.resetAt - at) / 1000))));
      throw new HttpError(429, "rate_limited", "Too many requests. Try again in a moment.");
    }
    await next();
  };
}

export function clientAddress<E extends Env>(c: Context<E>): string {
  return c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
}
