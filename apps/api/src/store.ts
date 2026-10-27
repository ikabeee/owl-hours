// In-memory job store. Postgres + Supabase replaces this adapter in the
// next slice; routes depend only on the functions below.
import { transitionJob } from "@owl-hours/shared";
import type { JobActor, JobState } from "@owl-hours/shared";

export type Job = {
  id: string;
  title: string;
  customer: string;
  state: JobState;
  total_min: number;
  total_max: number;
  arrival_window: string;
};

export type JobEvent = {
  job_id: string;
  actor: JobActor;
  type: string;
  payload: Record<string, string>;
};

export type Store = {
  listJobs: () => Job[];
  getJob: (id: string) => Job | undefined;
  propose: (id: string, to: JobState, actor: JobActor, reason: string) => Job;
  events: JobEvent[];
};

// Demo seed: Ana's toilet at 12:04 AM, plus two jobs further along.
export function createStore(): Store {
  const jobs: Job[] = [
    {
      id: "job-ana-toilet",
      title: "Toilet won't stop running",
      customer: "Ana L.",
      state: "proposed",
      total_min: 130,
      total_max: 160,
      arrival_window: "12:40-1:10 AM",
    },
    {
      id: "job-calle-faucet",
      title: "Kitchen faucet leak",
      customer: "Luis C.",
      state: "owner_confirmed",
      total_min: 70,
      total_max: 110,
      arrival_window: "1:00-1:30 AM",
    },
    {
      id: "job-parque-heater",
      title: "Water heater check",
      customer: "Marta P.",
      state: "en_route",
      total_min: 45,
      total_max: 45,
      arrival_window: "12:20-12:50 AM",
    },
  ];
  const events: JobEvent[] = [];
  return { listJobs, getJob, propose, events };

  function listJobs(): Job[] {
    return jobs;
  }

  function getJob(id: string): Job | undefined {
    return jobs.find((job) => job.id === id);
  }

  function propose(id: string, to: JobState, actor: JobActor, reason: string): Job {
    const job = getJob(id);
    if (!job) {
      throw new Error(`Unknown job ${id}`);
    }
    const from = job.state;
    job.state = transitionJob(from, to, actor);
    events.push({ job_id: id, actor, type: "transition", payload: { from, to, reason } });
    return job;
  }
}
