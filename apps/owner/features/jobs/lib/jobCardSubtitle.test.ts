// Spec: docs/HANDOFF-OWNER-APP.md, T5.1 assignment, test file 1 ("card subtitle"):
// "Ana L. · Mario R. · $130–160" for an approved job, "Carlos M. · $80–110" while the quote waits for the
// customer (no technician before approval, assumption A2 in the RED report).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob } from "../../../shared/data/mock.ts";
import type { Job } from "../../../shared/data/types.ts";
import { jobCardSubtitle } from "./jobCardSubtitle.ts";

function jobWith(overrides: Partial<Job>): Job {
  return { ...anaJob, ...overrides };
}

describe("jobCardSubtitle", () => {
  it('reads "Ana L. · Mario R. · $130–160" for Ana\'s approved job', () => {
    assert.equal(jobCardSubtitle(anaJob), "Ana L. · Mario R. · $130–160");
  });

  it('reads "Carlos M. · $80–110" while the quote waits for Carlos, even if a technician is set', () => {
    const carlos = jobWith({
      customerName: "Carlos M.",
      technician: "Mario R.",
      status: "quoted",
      quote: { ...anaJob.quote, lines: [{ label: "Unclog a drain", amount: { min: 80, max: 110 } }], total: { min: 80, max: 110 } },
    });

    assert.equal(jobCardSubtitle(carlos), "Carlos M. · $80–110");
  });

  it("also leaves the technician out before the owner confirms", () => {
    assert.equal(jobCardSubtitle(jobWith({ status: "owner_confirmed" })), "Ana L. · $130–160");
  });

  for (const status of ["en_route", "on_site"] as const) {
    it(`keeps the technician once the job is ${status}`, () => {
      assert.equal(jobCardSubtitle(jobWith({ status })), "Ana L. · Mario R. · $130–160");
    });
  }

  it("writes a quote whose ends are equal as one amount", () => {
    const flatQuote = { ...anaJob.quote, total: { min: 45, max: 45 } };

    assert.equal(jobCardSubtitle(jobWith({ quote: flatQuote })), "Ana L. · Mario R. · $45");
  });
});
