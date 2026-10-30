// Spec: docs/HANDOFF-OWNER-APP.md, T5.1 assignment, test file 2: `listJobs` returns the seeded jobs as
// domain types. Also pins the demo seed the fake client serves (the design's other jobs, additive to Ana).
// SUPERSEDES jobsService.demoClient.test.ts "has no quote draft for c_carlos": Carlos now has a job.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob } from "../../../shared/data/mock.ts";
import type { Job } from "../../../shared/data/types.ts";
import { quoteTotal } from "../lib/quoteTotal.ts";
import { createFakeJobsClient, createInMemoryJobsClient, createJobsService } from "./jobsService.ts";

function jobWith(overrides: Partial<Job>): Job {
  return { ...anaJob, ...overrides };
}

describe("jobsService.listJobs", () => {
  it("returns every job of the store, in the store's order", async () => {
    const carlos = jobWith({ id: "job_carlos", conversationId: "c_carlos", status: "quoted" });
    const service = createJobsService(createInMemoryJobsClient([anaJob, carlos]));

    assert.deepEqual(await service.listJobs(), [anaJob, carlos]);
  });

  it("is empty for an empty store", async () => {
    assert.deepEqual(await createJobsService(createInMemoryJobsClient([])).listJobs(), []);
  });

  it("returns copies: changing the result does not change the store", async () => {
    const service = createJobsService(createInMemoryJobsClient([anaJob]));

    const [listed] = await service.listJobs();
    if (listed) listed.status = "done";

    assert.equal((await service.getJob("job_ana"))?.status, "customer_approved");
  });

  it("shows a status change on the next listing", async () => {
    const service = createJobsService(createInMemoryJobsClient([anaJob]));

    await service.updateJobStatus("job_ana", "en_route");

    assert.equal((await service.listJobs())[0]?.status, "en_route");
  });
});

describe("the demo seed of the fake jobs client", () => {
  const buildService = () => createJobsService(createFakeJobsClient());

  it("lists Ana's job, Carlos's, then the two Tomorrow jobs", async () => {
    const ids = (await buildService().listJobs()).map((job) => job.id);

    assert.deepEqual(ids, ["job_ana", "job_carlos", "job_lucia", "job_grace"]);
  });

  it("keeps Ana's job exactly as in shared/data", async () => {
    const [ana] = await buildService().listJobs();

    assert.deepEqual(ana, anaJob);
  });

  it("seeds Carlos's job: quoted, $80–110, and no street address before he approves", async () => {
    const carlos = await buildService().getJob("job_carlos");

    assert.equal(carlos?.conversationId, "c_carlos");
    assert.equal(carlos?.customerName, "Carlos M.");
    assert.equal(carlos?.title, "Kitchen sink clogged");
    assert.equal(carlos?.status, "quoted");
    assert.deepEqual(carlos?.quote.total, { min: 80, max: 110 });
    assert.equal(carlos?.address, undefined);
  });

  it("gives Carlos a quote draft now that his job exists", async () => {
    assert.equal((await buildService().getQuoteDraft("c_carlos"))?.jobId, "job_carlos");
  });

  it("seeds the Tomorrow jobs with their visit time", async () => {
    const service = buildService();
    const lucia = await service.getJob("job_lucia");
    const grace = await service.getJob("job_grace");

    assert.deepEqual([lucia?.title, lucia?.customerName, lucia?.scheduledFor], ["Water heater install", "Lucía R.", "2026-10-29T10:00:00-05:00"]);
    assert.deepEqual([grace?.title, grace?.customerName, grace?.scheduledFor], ["Shower valve check", "Grace K.", "2026-10-29T14:30:00-05:00"]);
  });

  it("seeds only unfinished jobs", async () => {
    const statuses = (await buildService().listJobs()).map((job) => job.status);

    assert.equal(statuses.includes("done"), false);
  });

  it("keeps every seeded quote consistent: the total is the sum of the lines", async () => {
    for (const job of await buildService().listJobs()) {
      assert.deepEqual(job.quote.total, quoteTotal(job.quote.lines), job.id);
    }
  });

  it("does not leak into the shared mock: listing twice from fresh services is identical", async () => {
    assert.deepEqual(await buildService().listJobs(), await buildService().listJobs());
  });
});
