// Response envelope and error mapping for /v1. Every response is
// { success: true, data } or { success: false, error: { code, message } }.
// Database errors keep their Postgres code (see docs/DATA-MODEL.md) and map
// to a status; anything unexpected becomes a 500 without internal detail.
import type { Context, Env } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import { RepositoryError } from "../db/repository.ts";

export class HttpError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: string;

  constructor(status: ContentfulStatusCode, code: string, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

const POSTGRES_ERRORS: Record<string, { status: ContentfulStatusCode; code: string }> = {
  P0002: { status: 404, code: "not_found" },
  PGRST116: { status: 404, code: "not_found" },
  "22023": { status: 422, code: "invalid_state" },
  "22P02": { status: 400, code: "invalid_input" },
  "23505": { status: 409, code: "conflict" },
  "23514": { status: 422, code: "rule_violation" },
  "40001": { status: 409, code: "changed_since_read" },
  "42501": { status: 403, code: "forbidden" },
};

export function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }
  if (error instanceof RepositoryError && error.code) {
    const mapped = POSTGRES_ERRORS[error.code];
    if (mapped) {
      return new HttpError(mapped.status, mapped.code, error.message);
    }
  }
  return new HttpError(500, "internal", "Something went wrong on our side. Try again.");
}

export function ok<E extends Env, T>(c: Context<E>, data: T, status: ContentfulStatusCode = 200) {
  return c.json({ success: true as const, data }, status);
}

export function errorResponse<E extends Env>(c: Context<E>, error: unknown) {
  const http = toHttpError(error);
  if (!(error instanceof HttpError) && http.status >= 500) {
    // Server-side detail only; the client gets the generic message.
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error(`[api] ${c.req.method} ${c.req.path} failed: ${detail}`);
  }
  return c.json({ success: false as const, error: { code: http.code, message: http.message } }, http.status);
}

function describe(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) {
    return "Invalid request.";
  }
  const where = issue.path.join(".");
  return where ? `${where}: ${issue.message}` : issue.message;
}

export async function readJson<E extends Env, S extends z.ZodTypeAny>(c: Context<E>, schema: S): Promise<z.infer<S>> {
  const raw: unknown = await c.req.json().catch(() => undefined);
  const parsed = schema.safeParse(raw ?? {});
  if (!parsed.success) {
    throw new HttpError(400, "invalid_body", describe(parsed.error));
  }
  return parsed.data;
}

export function readQuery<E extends Env, S extends z.ZodTypeAny>(c: Context<E>, schema: S): z.infer<S> {
  const parsed = schema.safeParse(c.req.query());
  if (!parsed.success) {
    throw new HttpError(400, "invalid_query", describe(parsed.error));
  }
  return parsed.data;
}

const uuid = z.string().uuid();

export function readId<E extends Env>(c: Context<E>, name = "id"): string {
  const parsed = uuid.safeParse(c.req.param(name));
  if (!parsed.success) {
    throw new HttpError(400, "invalid_id", `${name} must be a uuid`);
  }
  return parsed.data;
}
