// Unwraps a supabase-js result, keeping the Postgres error code.
import { RepositoryError } from "../db/repository.ts";

type DbResult<T> = { data: T; error: { message: string; code?: string } | null };

export function unwrap<T>(result: DbResult<T>): T {
  if (result.error) {
    throw new RepositoryError(result.error.message, result.error.code ?? null);
  }
  return result.data;
}
