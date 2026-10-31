// Spec: docs/HANDOFF-OWNER-APP.md, T5.2 assignment, test group 3: cross-feature, through the public
// services. Sending Ana's quote with the shared demo jobs service makes the shared demo conversations
// service return Ana's thread with one more owner message carrying the quote.
// This is the only test that imports a sibling feature (jobs); the feature code itself never does, it meets
// the other side only through shared/data/threadStore.ts. Open question Q6 asks where it should live.
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob, anaMessages } from "../../../shared/data/mock.ts";
import type { Quote } from "../../../shared/data/types.ts";
import { resetSharedThreadStore } from "../../../shared/data/threadStore.ts";
import { wallClockTimeText } from "../../../shared/lib/wallClockTime.ts";
import { resetSharedDemoJobsService, sharedDemoJobsService, sharedDemoNow } from "../../jobs/hooks/demoJobsService.ts";
import { resetSharedDemoConversationsService, sharedDemoConversationsService } from "../hooks/demoConversationsService.ts";

beforeEach(() => {
  resetSharedThreadStore();
  resetSharedDemoJobsService();
  resetSharedDemoConversationsService();
});

const invalidQuote: Quote = {
  ...anaJob.quote,
  lines: [{ label: "Visit", amount: { min: 90, max: 60 } }],
  total: { min: 90, max: 60 },
};

describe("quote sent from the jobs side, read from the chats side", () => {
  it("adds one owner message carrying Ana's quote, at the jobs demo clock's time: 12:07 AM", async () => {
    const before = sharedDemoNow();
    await sharedDemoJobsService().sendQuote("c_ana", anaJob.quote);
    const after = sharedDemoNow();

    const messages = await sharedDemoConversationsService().getMessages("c_ana");

    assert.deepEqual(messages?.slice(0, anaMessages.length), anaMessages);
    assert.equal(messages?.length, anaMessages.length + 1);
    const sent = messages?.at(-1);
    assert.equal(sent?.from, "owner");
    assert.deepEqual(sent?.quote, anaJob.quote);
    assert.match(sent?.text ?? "", /^Mario R\. · arrives 12:55–1:25 AM\n/);
    assert.ok(Date.parse(sent?.sentAt ?? "") >= Date.parse(before) && Date.parse(sent?.sentAt ?? "") <= Date.parse(after));
    assert.equal(wallClockTimeText(sent?.sentAt ?? ""), "12:07 AM");
  });

  it("adds nothing when the quote is refused: invalid lines, unknown conversation", async () => {
    await sharedDemoJobsService().sendQuote("c_ana", invalidQuote);
    await sharedDemoJobsService().sendQuote("nope", anaJob.quote);

    assert.deepEqual(await sharedDemoConversationsService().getMessages("c_ana"), anaMessages);
    assert.equal(await sharedDemoConversationsService().getMessages("nope"), null);
  });

  it("adds two messages when the quote is sent twice", async () => {
    await sharedDemoJobsService().sendQuote("c_ana", anaJob.quote);
    await sharedDemoJobsService().sendQuote("c_ana", anaJob.quote);

    const messages = await sharedDemoConversationsService().getMessages("c_ana");

    assert.equal(messages?.length, anaMessages.length + 2);
    assert.deepEqual(messages?.slice(anaMessages.length).map((message) => message.from), ["owner", "owner"]);
  });
});
