// Spec: docs/HANDOFF-OWNER-APP.md, T5.2 assignment, operator decision "the chats fake client reads and
// writes [the shared thread store] when it is the shared demo; createFakeConversationsClient() keeps
// returning independent clients", and test groups 2 and 5 (touched behaviors: Ana's seeded thread, the
// SuggestionRow and polish sending stay unchanged, now read through the shared demo service).
// Names (open question Q5): sharedDemoConversationsService() and resetSharedDemoConversationsService() in
// features/chats/hooks/demoConversationsService.ts (like features/jobs/hooks/demoJobsService.ts);
// createFakeConversationsClient({ threads }) takes the store, independent when omitted.
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { OWNER_TEXT, POLISHED_TEXT, anaMessages } from "../../../shared/data/mock.ts";
import type { Message } from "../../../shared/data/types.ts";
import { resetSharedThreadStore, sharedThreadStore } from "../../../shared/data/threadStore.ts";
import { resetSharedDemoConversationsService, sharedDemoConversationsService } from "../hooks/demoConversationsService.ts";
import { createConversationsService, createFakeConversationsClient } from "./conversationsService.ts";

beforeEach(() => {
  resetSharedThreadStore();
  resetSharedDemoConversationsService();
});

const quoteMessage: Message = {
  id: "m_quote_1",
  from: "owner",
  text: "Mario R. · arrives 12:55–1:25 AM",
  sentAt: "2026-10-28T00:07:00-05:00",
};

describe("sharedDemoConversationsService", () => {
  it("reads a message that another consumer appended to the shared thread store", async () => {
    sharedThreadStore().append("c_ana", quoteMessage);

    const messages = await sharedDemoConversationsService().getMessages("c_ana");

    assert.deepEqual(messages, [...anaMessages, quoteMessage]);
  });

  it("writes a sent message to the shared thread store, where another consumer reads it", async () => {
    const result = await sharedDemoConversationsService().sendMessage("c_ana", OWNER_TEXT, { polish: false });

    assert.ok(result && "sent" in result);
    assert.deepEqual(sharedThreadStore().messages("c_ana"), [...anaMessages, result.sent]);
  });

  it("starts from Ana's seeded thread: Zukki's summary, then her question", async () => {
    assert.deepEqual(await sharedDemoConversationsService().getMessages("c_ana"), anaMessages);
  });

  it("still suggests job_ana and $130–160 for Ana, and nothing for c_carlos", async () => {
    const service = sharedDemoConversationsService();

    assert.deepEqual(await service.getQuoteSuggestion("c_ana"), { jobId: "job_ana", suggestedQuote: { min: 130, max: 160 } });
    assert.equal(await service.getQuoteSuggestion("c_carlos"), null);
  });

  it("still polishes OWNER_TEXT into POLISHED_TEXT without appending anything, and appends the chosen version", async () => {
    const service = sharedDemoConversationsService();

    const preview = await service.sendMessage("c_ana", OWNER_TEXT, { polish: true });

    assert.deepEqual(preview, { original: OWNER_TEXT, polished: POLISHED_TEXT, language: "English" });
    assert.deepEqual(sharedThreadStore().messages("c_ana"), anaMessages);

    const sent = await service.sendPolishChoice("c_ana", { original: OWNER_TEXT, polished: POLISHED_TEXT, language: "English" }, "zukki");

    assert.equal(sent?.text, POLISHED_TEXT);
    assert.equal(sent?.delivery, "polished");
    assert.equal(sent?.ownerDraft, OWNER_TEXT);
    assert.deepEqual(sharedThreadStore().messages("c_ana"), [...anaMessages, sent]);
  });
});

describe("createFakeConversationsClient", () => {
  it("still hands out independent clients: a message saved through one is invisible to another and to the shared store", async () => {
    const first = createConversationsService(createFakeConversationsClient());
    const second = createConversationsService(createFakeConversationsClient());

    await first.sendMessage("c_ana", OWNER_TEXT, { polish: false });

    assert.deepEqual(await second.getMessages("c_ana"), anaMessages);
    assert.deepEqual(sharedThreadStore().messages("c_ana"), anaMessages);
  });
});
