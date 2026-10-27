// Business agent: summarizes a job for the owner inbox (screen 04).
import type { Job } from "../store.ts";

export function summarizeForOwner(job: {
  title: string;
  customer: string;
  state: string;
  total_min: number;
  total_max: number;
  arrival_window: string;
}): string {
  return (
    `${job.title} for ${job.customer} is ${job.state}. ` +
    `Estimate $${job.total_min}-${job.total_max}, window ${job.arrival_window}.`
  );
}

export type { Job };
