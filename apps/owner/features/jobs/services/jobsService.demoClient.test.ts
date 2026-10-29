// Spec: operator answers 2 and 11 (T5). The demo client plays the customer: after the owner sends a quote
// it approves on Ana's behalf, so the demo path continues without WhatsApp. The service contract
// ("sendQuote marks the job quoted") is pinned in jobsService.test.ts against a client that never approves.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob } from "../../../shared/data/mock.ts";
import type { Quote } from "../../../shared/data/types.ts";
import { createFakeJobsClient, createJobsService } from "./jobsService.ts";

const APPROVED_AT = "2026-10-28T00:09:00-05:00";
const untouchedAnaJob = structuredClone(anaJob);

function buildService() {
  return createJobsService(createFakeJobsClient({ now: () => APPROVED_AT }));
}

const editedQuote: Quote = {
  ...anaJob.quote,
  lines: [
    { label: "Visit", amount: 45 },
    { label: "Night fee", amount: 30 },
    { label: "Fill valve repair", amount: { min: 60, max: 90 } },
  ],
  total: { min: 135, max: 165 },
};

describe("fake jobs client seed", () => {
  it("serves Ana's demo job untouched", async () => {
    assert.deepEqual(await buildService().getJob("job_ana"), untouchedAnaJob);
  });

  it("has no quote draft for c_carlos: a real conversation whose job does not exist", async () => {
    assert.equal(await buildService().getQuoteDraft("c_carlos"), null);
  });
});

describe("fake jobs client approves on Ana's behalf after sendQuote", () => {
  it("the job reads customer_approved again, approved at the client's clock", async () => {
    const service = buildService();

    await service.sendQuote("c_ana", editedQuote);

    const job = await service.getJob("job_ana");
    assert.equal(job?.status, "customer_approved");
    assert.equal(job?.approvedAt, APPROVED_AT);
  });

  it('the timeline ends with "Quote sent and approved" at that time, once', async () => {
    const service = buildService();

    await service.sendQuote("c_ana", editedQuote);

    const timeline = (await service.getJob("job_ana"))?.timeline ?? [];
    assert.deepEqual(timeline.at(-1), { at: APPROVED_AT, text: "Quote sent and approved" });
    assert.equal(timeline.filter((event) => event.text === "Quote sent and approved").length, 1);
  });

  it("the approved job carries the quote the owner sent", async () => {
    const service = buildService();

    await service.sendQuote("c_ana", editedQuote);

    assert.deepEqual((await service.getJob("job_ana"))?.quote, editedQuote);
  });
});

describe("fake jobs client isolation", () => {
  it("does not mutate the shared mock: a fresh service still sees Ana's untouched job", async () => {
    await buildService().sendQuote("c_ana", editedQuote);

    assert.deepEqual(anaJob, untouchedAnaJob);
    assert.deepEqual(await buildService().getJob("job_ana"), untouchedAnaJob);
  });
});
