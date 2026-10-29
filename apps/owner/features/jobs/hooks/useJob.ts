import { useEffect, useState } from "react";
import type { ID, Job } from "../../../shared/data/types.ts";
import { buildJobView } from "../lib/jobView.ts";
import type { JobView } from "../lib/jobView.ts";
import type { JobsService } from "../services/jobsService.ts";
import { createDemoJobsService } from "./demoJobsService.ts";

export type JobDeps = { service: JobsService };

// The serializable view for the screen, and the callback that moves the job to its next status.
export type JobScreenView = { job: JobView; advance: () => Promise<boolean> };

// Returns null while the job loads, or when it does not exist.
// Pass a stable service (a module constant or memoized): changing it reloads the job.
export function useJob(id: ID, deps?: Partial<JobDeps>): JobScreenView | null {
  const [defaults] = useState(createDemoDeps);
  const service = deps?.service ?? defaults.service;
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    let isCurrent = true;
    service.getJob(id).then((loaded) => {
      if (isCurrent) setJob(loaded);
    });
    return () => {
      isCurrent = false;
    };
  }, [service, id]);

  if (!job) return null;

  const view = buildJobView(job);
  return { job: view, advance: () => moveToNextStatus(service, job, view.action.nextStatus, setJob) };
}

// Refused (already moved on, or nothing to do) and failed both answer false; the screen keeps what it shows.
async function moveToNextStatus(
  service: JobsService,
  job: Job,
  nextStatus: Job["status"] | null,
  show: (job: Job) => void,
): Promise<boolean> {
  if (!nextStatus) return false;

  try {
    const moved = await service.updateJobStatus(job.id, nextStatus);
    if (moved) show(moved);
    return moved !== null;
  } catch {
    return false;
  }
}

function createDemoDeps(): JobDeps {
  return { service: createDemoJobsService() };
}
