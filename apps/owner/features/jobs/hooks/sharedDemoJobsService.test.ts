// Spec: docs/HANDOFF-OWNER-APP.md, T5.1 assignment, test file 3, with the operator decision "one
// module-level demo jobs service ... shared by useJobs, useJob, the finish hook and useQuoteDraft, so a
// status change on one screen shows on the others". Tested at the service level (the app has no React
// tests): every `sharedDemoJobsService()` call hands out the same store.
// Names (open question Q10): sharedDemoJobsService(), sharedDemoNow() (the demo clock the hooks segment
// jobs with) and resetSharedDemoJobsService() (tests start every case from the seed).
// createDemoJobsService() keeps returning independent services.
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob } from "../../../shared/data/mock.ts";
import type { Quote } from "../../../shared/data/types.ts";
import { jobSegment, jobsInSegment } from "../lib/jobSegment.ts";
import { createDemoJobsService, resetSharedDemoJobsService, sharedDemoJobsService, sharedDemoNow } from "./demoJobsService.ts";

beforeEach(() => resetSharedDemoJobsService());

const editedQuote: Quote = {
  ...anaJob.quote,
  lines: [
    { label: "Visit", amount: 45 },
    { label: "Night fee", amount: 30 },
    { label: "Fill valve repair", amount: { min: 60, max: 90 } },
  ],
  total: { min: 135, max: 165 },
};

const ana = { amounts: [45, 25, 75], asksToSharePhotos: true };

describe("sharedDemoJobsService", () => {
  it("shows a status change made through one consumer to the next read of another", async () => {
    const jobScreen = sharedDemoJobsService();
    const jobsScreen = sharedDemoJobsService();

    await jobScreen.updateJobStatus("job_ana", "en_route");

    assert.equal((await jobsScreen.getJob("job_ana"))?.status, "en_route");
    const listed = await jobsScreen.listJobs();
    assert.equal(listed.find((job) => job.id === "job_ana")?.status, "en_route");
  });

  it("shows the quote sent from the chat on the job read by another consumer", async () => {
    await sharedDemoJobsService().sendQuote("c_ana", editedQuote);

    const job = await sharedDemoJobsService().getJob("job_ana");
    assert.deepEqual(job?.quote, editedQuote);
    assert.equal(job?.status, "customer_approved");
  });

  it("carries the demo path: Start trip, I'm here, Finish, and Ana sits under Done", async () => {
    const service = sharedDemoJobsService();

    await service.updateJobStatus("job_ana", "en_route");
    await service.updateJobStatus("job_ana", "on_site");
    await service.finishJob("job_ana", ana);

    const jobs = await sharedDemoJobsService().listJobs();
    const idsIn = (segment: "tonight" | "upcoming" | "done") => jobsInSegment(jobs, segment, sharedDemoNow()).map((job) => job.id);
    assert.deepEqual(idsIn("done"), ["job_ana"]);
    assert.deepEqual(idsIn("tonight"), ["job_carlos"]);
    assert.deepEqual(idsIn("upcoming"), ["job_lucia", "job_grace"]);
  });

  it('records "Done" no earlier than "On the way" on the demo clock', async () => {
    const service = sharedDemoJobsService();
    await service.updateJobStatus("job_ana", "en_route");
    await service.updateJobStatus("job_ana", "on_site");

    const job = await service.finishJob("job_ana", ana);

    const [trip, done] = job?.timeline.slice(-2) ?? [];
    assert.equal(trip?.text, "On the way");
    assert.equal(done?.text, "Done");
    assert.ok(Date.parse(done?.at ?? "") >= Date.parse(trip?.at ?? ""), `${done?.at} is before ${trip?.at}`);
  });

  it("starts the next consumer from the seed after a reset", async () => {
    await sharedDemoJobsService().updateJobStatus("job_ana", "en_route");

    resetSharedDemoJobsService();

    const jobs = await sharedDemoJobsService().listJobs();
    assert.equal(jobs.find((job) => job.id === "job_ana")?.status, "customer_approved");
    assert.equal(jobs.length, 4);
  });
});

describe("sharedDemoNow", () => {
  it("sits on the designs' night, so the seed splits into Tonight and Upcoming", async () => {
    const jobs = await sharedDemoJobsService().listJobs();

    const segments = jobs.map((job) => [job.id, jobSegment(job, sharedDemoNow())]);

    assert.deepEqual(segments, [
      ["job_ana", "tonight"],
      ["job_carlos", "tonight"],
      ["job_lucia", "upcoming"],
      ["job_grace", "upcoming"],
    ]);
  });

  it("writes the instant in the demo's own offset", () => {
    assert.match(sharedDemoNow(), /^2026-10-28T00:\d{2}:\d{2}-05:00$/);
  });
});

describe("createDemoJobsService", () => {
  it("still hands out independent services: a change in one is invisible to another", async () => {
    const first = createDemoJobsService();
    const second = createDemoJobsService();

    await first.updateJobStatus("job_ana", "en_route");

    assert.equal((await second.getJob("job_ana"))?.status, "customer_approved");
  });

  it("is independent of the shared service", async () => {
    await createDemoJobsService().updateJobStatus("job_ana", "en_route");

    assert.equal((await sharedDemoJobsService().getJob("job_ana"))?.status, "customer_approved");
  });
});
