// Spec: operator answer 2 (L36): updateJobStatus to en_route appends { at: now, text: "On the way" }
// (the clock is injected like conversationsService); on_site appends nothing.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob } from "../../../shared/data/mock.ts";
import { createInMemoryJobsClient, createJobsService } from "./jobsService.ts";

const NOW = "2026-10-28T00:30:00-05:00";

function buildService() {
  return createJobsService(createInMemoryJobsClient([anaJob]), { now: () => NOW });
}

describe("jobsService.updateJobStatus and the timeline", () => {
  it('en_route appends { at: now, text: "On the way" } after the existing entries', async () => {
    const service = buildService();

    const job = await service.updateJobStatus("job_ana", "en_route");

    assert.deepEqual(job?.timeline, [...anaJob.timeline, { at: NOW, text: "On the way" }]);
    assert.deepEqual((await service.getJob("job_ana"))?.timeline, job?.timeline);
  });

  it("on_site appends nothing", async () => {
    const service = buildService();
    const enRoute = await service.updateJobStatus("job_ana", "en_route");

    const onSite = await service.updateJobStatus("job_ana", "on_site");

    assert.deepEqual(onSite?.timeline, enRoute?.timeline);
  });

  it("a refused transition appends nothing", async () => {
    const service = buildService();

    await service.updateJobStatus("job_ana", "on_site");

    assert.deepEqual((await service.getJob("job_ana"))?.timeline, anaJob.timeline);
  });
});
