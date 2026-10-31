// Spec: docs/HANDOFF-OWNER-APP.md, T5.1 assignment, test file 2: `finishJob(id, final)` from on_site marks
// the job done with `finalTotal` and `shareConsent` ("asked" when the switch is on, else "not_asked"),
// refuses any other status, an unknown id, invalid amounts, and an out-of-estimate total without a reason.
// Refusals answer null and leave the job untouched, like the rest of the service (T5 answer 3).
// `updateJobStatus(id, "done")` stays refused: only `finishJob` reaches done.
// Shape of `final` (open question Q9): { amounts: Money[] (one per quote line), reason?: string,
// asksToSharePhotos: boolean }. The estimate is the stored quote total ($130–160 for Ana).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob } from "../../../shared/data/mock.ts";
import type { Job, JobStatus } from "../../../shared/data/types.ts";
import { createInMemoryJobsClient, createJobsService } from "./jobsService.ts";

const DONE_AT = "2026-10-28T01:35:00-05:00";
const onSiteAna: Job = { ...anaJob, status: "on_site" };

function buildService(seed: Job[] = [onSiteAna]) {
  return createJobsService(createInMemoryJobsClient(seed), { now: () => DONE_AT });
}

const asAnaPlannedIt = { amounts: [45, 25, 75], asksToSharePhotos: true };

describe("jobsService.finishJob from on_site", () => {
  it("marks the job done with the final total and asked consent", async () => {
    const job = await buildService().finishJob("job_ana", asAnaPlannedIt);

    assert.equal(job?.status, "done");
    assert.equal(job?.finalTotal, 145);
    assert.equal(job?.shareConsent, "asked");
  });

  it('records "not_asked" when the switch is off', async () => {
    const job = await buildService().finishJob("job_ana", { ...asAnaPlannedIt, asksToSharePhotos: false });

    assert.equal(job?.shareConsent, "not_asked");
  });

  it("overwrites an earlier consent and total: Ana's seed says yes and $145 before she is even done", async () => {
    const job = await buildService().finishJob("job_ana", { amounts: [45, 25, 70], asksToSharePhotos: false });

    assert.equal(job?.finalTotal, 140);
    assert.equal(job?.shareConsent, "not_asked");
  });

  it('appends "Done" to the timeline at the service clock', async () => {
    const job = await buildService().finishJob("job_ana", asAnaPlannedIt);

    assert.deepEqual(job?.timeline, [...onSiteAna.timeline, { at: DONE_AT, text: "Done" }]);
  });

  it("changes nothing else: quote, address, technician and photos stay", async () => {
    const job = await buildService().finishJob("job_ana", asAnaPlannedIt);

    assert.ok(job);
    const { status: _s, finalTotal: _f, shareConsent: _c, timeline: _t, ...unchanged } = job;
    const { status: _s0, finalTotal: _f0, shareConsent: _c0, timeline: _t0, ...before } = onSiteAna;
    assert.deepEqual(unchanged, before);
  });

  it("is stored: the next read and the next listing see Ana done", async () => {
    const service = buildService();

    const finished = await service.finishJob("job_ana", asAnaPlannedIt);

    assert.deepEqual(await service.getJob("job_ana"), finished);
    assert.equal((await service.listJobs())[0]?.status, "done");
  });

  it("leaves the other jobs alone", async () => {
    const carlos: Job = { ...anaJob, id: "job_carlos", conversationId: "c_carlos", status: "quoted" };
    const service = buildService([onSiteAna, carlos]);

    await service.finishJob("job_ana", asAnaPlannedIt);

    assert.deepEqual(await service.getJob("job_carlos"), carlos);
  });

  it("does not store a reason when the total is inside the estimate", async () => {
    const job = await buildService().finishJob("job_ana", asAnaPlannedIt);

    assert.equal(job?.finalPriceReason, undefined);
  });
});

describe("jobsService.finishJob with a total outside the $130–160 estimate", () => {
  const outside = [
    { why: "above ($170)", amounts: [45, 25, 100] },
    { why: "below ($100)", amounts: [45, 25, 30] },
  ];

  for (const { why, amounts } of outside) {
    it(`finishes once a reason is given, ${why}, and stores it without surrounding spaces`, async () => {
      const job = await buildService().finishJob("job_ana", { amounts, reason: "  Needed a new flapper too  ", asksToSharePhotos: true });

      assert.equal(job?.status, "done");
      assert.equal(job?.finalTotal, amounts.reduce((sum, amount) => sum + amount, 0));
      assert.equal(job?.finalPriceReason, "Needed a new flapper too");
    });
  }

  it("finishes without a reason at both bounds of the estimate", async () => {
    const atLowerBound = await buildService().finishJob("job_ana", { amounts: [45, 25, 60], asksToSharePhotos: false });
    const atUpperBound = await buildService().finishJob("job_ana", { amounts: [45, 25, 90], asksToSharePhotos: false });

    assert.equal(atLowerBound?.finalTotal, 130);
    assert.equal(atUpperBound?.finalTotal, 160);
  });
});

describe("jobsService.finishJob refuses", () => {
  async function assertRefusedAndUntouched(final: Parameters<ReturnType<typeof buildService>["finishJob"]>[1], seed: Job[] = [onSiteAna]) {
    const service = buildService(seed);

    assert.equal(await service.finishJob(seed[0]?.id ?? "job_ana", final), null);
    assert.deepEqual(await service.listJobs(), seed);
  }

  const notOnSite: JobStatus[] = ["quoted", "owner_confirmed", "customer_approved", "en_route", "done"];
  for (const status of notOnSite) {
    it(`a job that is ${status}: null, and the job stays as it was`, async () => {
      await assertRefusedAndUntouched(asAnaPlannedIt, [{ ...anaJob, status }]);
    });
  }

  it("an unknown id: null", async () => {
    assert.equal(await buildService().finishJob("nope", asAnaPlannedIt), null);
  });

  const invalidAmounts = [
    { why: "a zero amount", amounts: [45, 0, 75] },
    { why: "a negative amount", amounts: [45, -25, 75] },
    { why: "an amount that is not a whole number", amounts: [45, 25, 75.5] },
    { why: "no amounts", amounts: [] },
    { why: "fewer amounts than quote lines", amounts: [45, 25] },
    { why: "more amounts than quote lines", amounts: [45, 25, 75, 10] },
  ];
  for (const { why, amounts } of invalidAmounts) {
    it(`${why}, even with a reason: null, and the job stays on site`, async () => {
      await assertRefusedAndUntouched({ amounts, reason: "Extra parts", asksToSharePhotos: true });
    });
  }

  const outsideWithoutReason = [
    { why: "above the estimate with no reason", final: { amounts: [45, 25, 100], asksToSharePhotos: true } },
    { why: "below the estimate with no reason", final: { amounts: [45, 25, 30], asksToSharePhotos: true } },
    { why: "outside the estimate with a blank reason", final: { amounts: [45, 25, 100], reason: "   ", asksToSharePhotos: true } },
  ];
  for (const { why, final } of outsideWithoutReason) {
    it(`a total ${why}: null, and the job stays on site`, async () => {
      await assertRefusedAndUntouched(final);
    });
  }
});

describe("jobsService.updateJobStatus once finishing exists", () => {
  it('still refuses "done" from on_site: only finishJob reaches done', async () => {
    const service = buildService();

    assert.equal(await service.updateJobStatus("job_ana", "done"), null);
    assert.equal((await service.getJob("job_ana"))?.status, "on_site");
  });

  it("refuses any move from a finished job", async () => {
    const service = buildService();
    await service.finishJob("job_ana", asAnaPlannedIt);

    for (const status of ["customer_approved", "en_route", "on_site", "done"] as const) {
      assert.equal(await service.updateJobStatus("job_ana", status), null, status);
    }
    assert.equal((await service.getJob("job_ana"))?.status, "done");
  });

  it("refuses to start the trip of a job still waiting for its customer", async () => {
    const quoted: Job = { ...anaJob, id: "job_carlos", conversationId: "c_carlos", status: "quoted" };
    const service = buildService([quoted]);

    assert.equal(await service.updateJobStatus("job_carlos", "en_route"), null);
    assert.equal((await service.getJob("job_carlos"))?.status, "quoted");
  });
});
