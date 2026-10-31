// Live mode: jobs come from the owner API. A proposed job (accepted, no quote yet) gets a draft quote
// from Zukki's suggested range; sending it posts the quote, and the footer steps post transitions.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createFakeOwnerApi } from "../../../lib/ownerApi.fake.ts";
import { createJobsService } from "./jobsService.ts";
import { clockText, createLiveJobsClient, toJob } from "./jobsLive.ts";
import type { ApiJob } from "./jobsLive.ts";

// Local wall-clock instants, so the tests read the same in every time zone.
const at = (h: number, m: number) => new Date(2026, 10, 3, h, m).toISOString();
const NOW = new Date(2026, 10, 3, 0, 10);

const approved: ApiJob = {
  id: "j1",
  conversationId: "c1",
  title: "Toilet won't stop running",
  state: "customer_approved",
  customerName: "Ana L.",
  technician: "Mario",
  total: { min: 130, max: 160 },
  finalTotal: null,
  location: { address: "12 Elm St" },
  quote: {
    lines: [
      { label: "Visit", min: 45, max: 45 },
      { label: "Repair", min: 85, max: 115 },
    ],
    total: { min: 130, max: 160 },
    arrivalFrom: at(0, 55),
    arrivalTo: at(1, 25),
    note: null,
  },
  shareConsent: "not_asked",
  timeline: [
    { at: at(0, 1), from: null, to: "proposed" },
    { at: at(0, 5), from: "proposed", to: "owner_confirmed" },
    { at: at(0, 7), from: "owner_confirmed", to: "customer_approved" },
  ],
};

const proposed: ApiJob = { ...approved, id: "j2", conversationId: "c2", state: "proposed", technician: null, quote: null, location: null, total: { min: 95, max: 125 }, timeline: [] };

describe("clockText", () => {
  it("writes local times like the designs", () => {
    assert.equal(clockText(at(0, 55)), "12:55 AM");
    assert.equal(clockText(at(13, 5)), "1:05 PM");
  });
});

describe("toJob", () => {
  it("maps a sent quote, the address and the approval time", () => {
    const job = toJob(approved, NOW);
    assert.equal(job.status, "customer_approved");
    assert.equal(job.address, "12 Elm St");
    assert.equal(job.approvedAt, at(0, 7));
    assert.deepEqual(job.quote.lines, [{ label: "Visit", amount: 45 }, { label: "Repair", amount: { min: 85, max: 115 } }]);
    assert.deepEqual(job.quote.arrival, { from: "12:55 AM", to: "1:25 AM" });
    assert.deepEqual(job.timeline.map((e) => e.text), ["Request accepted", "Quote sent", "Quote approved"]);
  });

  it("drafts a quote from the suggested range before one is sent", () => {
    const job = toJob(proposed, NOW);
    assert.equal(job.status, "owner_confirmed");
    assert.deepEqual(job.quote.lines, [{ label: "Visit and repair", amount: { min: 95, max: 125 } }]);
    assert.deepEqual(job.quote.arrival, { from: "12:40 AM", to: "1:10 AM" });
  });
});

describe("live jobs client", () => {
  function routes(extra: Record<string, unknown> = {}) {
    return createFakeOwnerApi({
      "GET /jobs?limit=100": [approved, proposed, { ...approved, id: "j3", state: "cancelled" }],
      "GET /jobs/j1": approved,
      "GET /jobs/j2": proposed,
      ...extra,
    });
  }

  it("lists real jobs only, not ones still waiting for a quote", async () => {
    const { api } = routes();
    const jobs = await createLiveJobsClient(api, () => NOW).listJobs();
    assert.deepEqual(jobs.map((j) => j.id), ["j1"]);
  });

  it("sends the edited quote with real arrival times", async () => {
    const { api, calls } = routes({ "POST /jobs/j2/quote": { id: "q1" } });
    const service = createJobsService(createLiveJobsClient(api, () => NOW), { now: () => NOW.toISOString() });
    const draft = await service.getQuoteDraft("c2");
    assert.ok(draft);
    const sent = await service.sendQuote("c2", draft.quote);
    assert.equal(sent?.status, "quoted");
    assert.deepEqual(calls.at(-1)?.body, {
      lines: [{ label: "Visit and repair", min: 95, max: 125 }],
      arrivalFrom: at(0, 40),
      arrivalTo: at(1, 10),
    });
  });

  it("posts the next footer step as a transition", async () => {
    const { api, calls } = routes({ "POST /jobs/j1/transition": { id: "j1", state: "en_route" } });
    const service = createJobsService(createLiveJobsClient(api, () => NOW), { now: () => NOW.toISOString() });
    assert.equal((await service.updateJobStatus("j1", "en_route"))?.status, "en_route");
    assert.deepEqual(calls.at(-1)?.body, { to: "en_route", reason: "owner update" });
  });
});
