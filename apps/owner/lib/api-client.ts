// HTTP client for the Zukki API. The base URL is build-time config so
// the same code hits localhost in dev and the demo server for judges.
import type { TonightJob } from "./tonight.ts";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export async function listJobs(): Promise<TonightJob[]> {
  const res = await fetch(`${API_BASE_URL}/jobs`);
  if (!res.ok) {
    throw new Error(`API answered ${res.status}`);
  }
  const body = (await res.json()) as { jobs: TonightJob[] };
  return body.jobs;
}

export async function proposeTransition(
  id: string,
  to: string,
  actor: "owner" | "customer",
  reason: string,
): Promise<TonightJob> {
  const res = await fetch(`${API_BASE_URL}/jobs/${id}/propose`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ to, actor, reason }),
  });
  if (!res.ok) {
    throw new Error(`API answered ${res.status}`);
  }
  const body = (await res.json()) as { job: TonightJob };
  return body.job;
}
