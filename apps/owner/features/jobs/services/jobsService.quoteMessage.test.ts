// Spec: docs/HANDOFF-OWNER-APP.md, T5.2 assignment, operator decision "the jobs side appends the quote
// message when a quote is sent, the way the backend will post it to the thread: the demo jobs client
// writes it into the shared thread store on `quoted`", test groups 2 and 3.
// Names (open question Q5): createFakeJobsClient({ now, threads }) takes the thread store, independent when
// omitted; sharedDemoJobsService() hands it sharedThreadStore().
// The message: the owner's, `text` = the body as plain lines, `quote` = the quote that was sent, sentAt = the
// client's clock; no `delivery` (the polish A/B rule does not apply to a quote).
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob, anaMessages } from "../../../shared/data/mock.ts";
import type { Quote } from "../../../shared/data/types.ts";
import { createThreadStore, resetSharedThreadStore, sharedThreadStore } from "../../../shared/data/threadStore.ts";
import { createDemoJobsService, resetSharedDemoJobsService, sharedDemoJobsService } from "../hooks/demoJobsService.ts";
import { createFakeJobsClient, createJobsService } from "./jobsService.ts";

const SENT_AT = "2026-10-28T00:07:00-05:00";

beforeEach(() => {
  resetSharedThreadStore();
  resetSharedDemoJobsService();
});

const DEMO_TEXT = [
  "Mario R. · arrives 12:55–1:25 AM",
  "",
  "Visit: $45",
  "Night fee: $25",
  "Fill valve repair: $60–90",
  "Estimated total: $130–160",
  "",
  "You pay Mario after the repair.",
].join("\n");

function buildService(threads = createThreadStore()) {
  return { threads, service: createJobsService(createFakeJobsClient({ now: () => SENT_AT, threads })) };
}

describe("fake jobs client writes the quote message", () => {
  it("appends Ana's owner message with the body text, the quote and the client's clock, and nothing else", async () => {
    const { threads, service } = buildService();

    await service.sendQuote("c_ana", anaJob.quote);

    const thread = threads.messages("c_ana");
    assert.equal(thread.length, anaMessages.length + 1);
    const { id, ...message } = thread[thread.length - 1]!;
    assert.match(id, /\S/);
    assert.deepEqual(message, { from: "owner", text: DEMO_TEXT, sentAt: SENT_AT, quote: anaJob.quote });
  });

  it("carries the quote the owner edited, not the seeded one", async () => {
    const { threads, service } = buildService();
    const editedQuote: Quote = {
      ...anaJob.quote,
      lines: [
        { label: "Visit", amount: 45 },
        { label: "Night fee", amount: 30 },
        { label: "Fill valve repair", amount: { min: 60, max: 90 } },
      ],
      total: { min: 135, max: 165 },
    };

    await service.sendQuote("c_ana", editedQuote);

    const sent = threads.messages("c_ana").at(-1);
    assert.deepEqual(sent?.quote, editedQuote);
    assert.match(sent?.text ?? "", /Night fee: \$30\n/);
    assert.match(sent?.text ?? "", /Estimated total: \$135–165\n/);
  });

  it("appends one message per quote sent, each with its own id", async () => {
    const { threads, service } = buildService();

    await service.sendQuote("c_ana", anaJob.quote);
    await service.sendQuote("c_ana", anaJob.quote);

    const sentIds = threads.messages("c_ana").slice(anaMessages.length).map((message) => message.id);
    assert.equal(sentIds.length, 2);
    assert.notEqual(sentIds[0], sentIds[1]);
  });

  it("appends nothing when the quote is invalid or the conversation is unknown", async () => {
    const { threads, service } = buildService();
    const invalidQuote: Quote = { ...anaJob.quote, lines: [{ label: "Visit", amount: { min: 90, max: 60 } }], total: { min: 90, max: 60 } };

    assert.equal(await service.sendQuote("c_ana", invalidQuote), null);
    assert.equal(await service.sendQuote("nope", anaJob.quote), null);

    assert.deepEqual(threads.messages("c_ana"), anaMessages);
    assert.deepEqual(threads.messages("nope"), []);
  });

  it("still marks the job approved when the quote goes out (the demo plays the customer)", async () => {
    const { service } = buildService();

    await service.sendQuote("c_ana", anaJob.quote);

    // sendQuote returns the job as saved ("quoted"); the demo approval shows on the next read (L47).
    const job = await service.getJob(anaJob.id);
    assert.equal(job?.status, "customer_approved");
    assert.equal(job?.approvedAt, SENT_AT);
  });
});

describe("demo jobs services and the shared thread store", () => {
  it("sharedDemoJobsService writes the quote message to the shared thread store", async () => {
    await sharedDemoJobsService().sendQuote("c_ana", anaJob.quote);

    const thread = sharedThreadStore().messages("c_ana");
    assert.equal(thread.length, anaMessages.length + 1);
    assert.deepEqual(thread.at(-1)?.quote, anaJob.quote);
  });

  it("createDemoJobsService stays independent: its quote message never reaches the shared store", async () => {
    await createDemoJobsService().sendQuote("c_ana", anaJob.quote);

    assert.deepEqual(sharedThreadStore().messages("c_ana"), anaMessages);
  });
});
