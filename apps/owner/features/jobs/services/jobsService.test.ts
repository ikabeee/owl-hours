// Spec: docs/HANDOFF-OWNER-APP.md, T5 assignment, test file 2, with operator answers 2, 3, 4 and 11.
// This file pins the service contract against a plain in-memory store that never approves anything,
// so "sendQuote marks the job quoted" is observable. The demo client that approves on Ana's behalf
// is pinned in jobsService.demoClient.test.ts. Every test builds its own service, so state never leaks.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob } from "../../../shared/data/mock.ts";
import type { JobStatus, Quote } from "../../../shared/data/types.ts";
import { createJobsService } from "./jobsService.ts";
import type { JobsClient } from "./jobsService.ts";

function createStoreClient(): JobsClient {
  const jobsById = new Map([[anaJob.id, structuredClone(anaJob)]]);

  return {
    findJobByConversationId: async (conversationId) =>
      structuredClone([...jobsById.values()].find((job) => job.conversationId === conversationId) ?? null),
    findJob: async (id) => structuredClone(jobsById.get(id) ?? null),
    listJobs: async () => structuredClone([...jobsById.values()]),
    saveJob: async (job) => {
      jobsById.set(job.id, structuredClone(job));
    },
  };
}

function buildService() {
  return createJobsService(createStoreClient());
}

async function serviceAt(status: Extract<JobStatus, "customer_approved" | "en_route" | "on_site">) {
  const service = buildService();
  const stepsToReach = { customer_approved: [], en_route: ["en_route"], on_site: ["en_route", "on_site"] } as const;
  for (const step of stepsToReach[status]) await service.updateJobStatus("job_ana", step);
  return service;
}

// Ana's quote with the night fee raised from $25 to $30: $135–165.
const editedQuote: Quote = {
  ...anaJob.quote,
  lines: [
    { label: "Visit", amount: 45 },
    { label: "Night fee", amount: 30 },
    { label: "Fill valve repair", amount: { min: 60, max: 90 } },
  ],
  total: { min: 135, max: 165 },
};

const quoteWithMinAboveMax: Quote = {
  ...anaJob.quote,
  lines: [{ label: "Visit", amount: { min: 90, max: 60 } }],
  total: { min: 90, max: 60 },
};

const quoteWithWrongTotal: Quote = { ...anaJob.quote, total: { min: 100, max: 200 } };

describe("jobsService.getQuoteDraft", () => {
  it("returns Zukki's pre-filled quote for Ana: demo lines, arrival, technician and note", async () => {
    const draft = await buildService().getQuoteDraft("c_ana");

    assert.equal(draft?.jobId, "job_ana");
    assert.equal(draft?.title, "Leaking toilet");
    assert.equal(draft?.customerName, "Ana L.");
    assert.deepEqual(draft?.quote, anaJob.quote);
  });

  it("returns null for an unknown conversation", async () => {
    assert.equal(await buildService().getQuoteDraft("nope"), null);
  });
});

describe("jobsService.sendQuote with a valid quote", () => {
  it("resolves the job marked quoted", async () => {
    const service = buildService();

    const job = await service.sendQuote("c_ana", editedQuote);

    assert.equal(job?.id, "job_ana");
    assert.equal(job?.status, "quoted");
    assert.equal((await service.getJob("job_ana"))?.status, "quoted");
  });

  it("stores the quote the owner sent, not Zukki's draft", async () => {
    const service = buildService();

    await service.sendQuote("c_ana", editedQuote);

    assert.deepEqual((await service.getJob("job_ana"))?.quote, editedQuote);
  });
});

describe("jobsService.sendQuote refuses", () => {
  const refusedQuotes = [
    { why: "a line whose min is above its max", quote: quoteWithMinAboveMax },
    { why: "a total that is not the sum of the lines", quote: quoteWithWrongTotal },
  ];

  for (const { why, quote } of refusedQuotes) {
    it(`${why}: null, and the job keeps its status and quote`, async () => {
      const service = buildService();

      assert.equal(await service.sendQuote("c_ana", quote), null);

      const job = await service.getJob("job_ana");
      assert.equal(job?.status, "customer_approved");
      assert.deepEqual(job?.quote, anaJob.quote);
    });
  }

  it("an unknown conversation: null", async () => {
    assert.equal(await buildService().sendQuote("nope", editedQuote), null);
  });
});

describe("jobsService.getJob", () => {
  it("returns Ana's approved job with her address", async () => {
    const job = await buildService().getJob("job_ana");

    assert.equal(job?.title, "Leaking toilet");
    assert.equal(job?.status, "customer_approved");
    assert.equal(job?.address, "128 Palm Ave, apt 4");
    assert.deepEqual(job?.timeline, anaJob.timeline);
  });

  it("returns null for an unknown id", async () => {
    assert.equal(await buildService().getJob("nope"), null);
  });
});

describe("jobsService.updateJobStatus moves only to the next owner step", () => {
  it("customer_approved -> en_route", async () => {
    const service = await serviceAt("customer_approved");

    const job = await service.updateJobStatus("job_ana", "en_route");

    assert.equal(job?.status, "en_route");
    assert.equal((await service.getJob("job_ana"))?.status, "en_route");
  });

  it("en_route -> on_site", async () => {
    const service = await serviceAt("en_route");

    const job = await service.updateJobStatus("job_ana", "on_site");

    assert.equal(job?.status, "on_site");
    assert.equal((await service.getJob("job_ana"))?.status, "on_site");
  });

  const refusedTransitions = [
    { from: "customer_approved", to: "on_site", why: "skips en_route" },
    { from: "customer_approved", to: "customer_approved", why: "stays on the same status" },
    { from: "en_route", to: "customer_approved", why: "goes backwards" },
    { from: "on_site", to: "done", why: "goes into done, which finishing the job owns (T5.1)" },
  ] as const;

  for (const { from, to, why } of refusedTransitions) {
    it(`refuses ${from} -> ${to} (${why}): null, and the status stays ${from}`, async () => {
      const service = await serviceAt(from);

      assert.equal(await service.updateJobStatus("job_ana", to), null);
      assert.equal((await service.getJob("job_ana"))?.status, from);
    });
  }

  it("returns null for an unknown id", async () => {
    assert.equal(await buildService().updateJobStatus("nope", "en_route"), null);
  });
});
