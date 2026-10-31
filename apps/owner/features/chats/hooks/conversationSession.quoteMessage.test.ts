// Spec: docs/HANDOFF-OWNER-APP.md, T5.2 assignment: the sent quote shows in the chat as a bubble that
// mirrors the WhatsApp message (13-quote.json), and the chat reloads its thread when it regains focus
// ("reload() on the hook", the D12 pattern) so coming back from the quote modal shows the new message.
// Names (open question Q4): ThreadMessage gains `quoteCard: QuoteCard | null`; the service gains
// getBusinessName() (the fake client answers business.name); the session gains reload(): Promise<void>.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob, anaMessages } from "../../../shared/data/mock.ts";
import type { Message } from "../../../shared/data/types.ts";
import type { ChatView } from "../lib/chatView.ts";
import { createConversationsService, createFakeConversationsClient } from "../services/conversationsService.ts";
import type { ConversationsClient } from "../services/conversationsService.ts";
import { createConversationSession } from "./conversationSession.ts";

const quoteMessage: Message = {
  id: "m_quote_1",
  from: "owner",
  text: [
    "Mario R. · arrives 12:55–1:25 AM",
    "",
    "Visit: $45",
    "Night fee: $25",
    "Fill valve repair: $60–90",
    "Estimated total: $130–160",
    "",
    "You pay Mario after the repair.",
  ].join("\n"),
  sentAt: "2026-10-28T00:07:00-05:00",
  quote: anaJob.quote,
};

function buildSession(overrides: Partial<ConversationsClient> = {}) {
  const client = { ...createFakeConversationsClient(), ...overrides };
  return createConversationSession(createConversationsService(client), "c_ana");
}

function chatOf(session: ReturnType<typeof buildSession>): ChatView {
  const snapshot = session.getSnapshot();
  assert.equal(snapshot.status, "ready");
  return (snapshot as { status: "ready"; chat: ChatView }).chat;
}

describe("session thread with a quote message", () => {
  it("gives the quote message its card and every other message none", async () => {
    const session = buildSession({ listMessages: async () => [...anaMessages, quoteMessage] });
    await session.load();

    const { thread } = chatOf(session);

    assert.deepEqual(thread.map((message) => message.quoteCard === null), [true, true, false]);
    assert.equal(thread[2]?.quoteCard?.header, "Quote from Northside Plumbing");
    assert.equal(thread[2]?.quoteCard?.totalLine, "Estimated total: $130–160");
    assert.deepEqual(thread[2]?.quoteCard?.replyLabels, ["Approve visit", "Ask a question"]);
  });

  it("puts no 'sent as written' metadata under the quote bubble", async () => {
    const session = buildSession({ listMessages: async () => [...anaMessages, quoteMessage] });
    await session.load();

    assert.equal(chatOf(session).thread[2]?.deliveryLabel, null);
  });
});

// Q2 (user, L46): once the thread holds a sent quote, Zukki no longer suggests sending one.
describe("session suggestion after the quote is sent", () => {
  it("keeps the suggestion while no quote was sent", async () => {
    const session = buildSession();
    await session.load();

    assert.equal(chatOf(session).suggestedQuoteText, "$130–160");
  });

  it("hides the suggestion once the thread holds a quote message, and keeps the job link", async () => {
    const session = buildSession({ listMessages: async () => [...anaMessages, quoteMessage] });
    await session.load();

    assert.equal(chatOf(session).suggestedQuoteText, null);
    assert.equal(chatOf(session).jobId, anaJob.id);
  });

  it("hides the suggestion after a reload brings the quote message in", async () => {
    let reads = 0;
    const session = buildSession({
      listMessages: async () => (++reads === 1 ? [...anaMessages] : [...anaMessages, quoteMessage]),
    });
    await session.load();

    await session.reload();

    assert.equal(chatOf(session).suggestedQuoteText, null);
  });
});

describe("session reload", () => {
  it("shows a message that arrived after the first load, without ever leaving the ready state", async () => {
    let reads = 0;
    const session = buildSession({
      listMessages: async () => (++reads === 1 ? [...anaMessages] : [...anaMessages, quoteMessage]),
    });
    await session.load();
    const statuses: string[] = [];
    session.subscribe(() => statuses.push(session.getSnapshot().status));

    await session.reload();

    assert.equal(chatOf(session).thread.length, anaMessages.length + 1);
    assert.equal(chatOf(session).thread[2]?.id, "m_quote_1");
    assert.ok(statuses.length > 0 && statuses.every((status) => status === "ready"), `statuses: ${statuses.join(", ")}`);
  });
});
