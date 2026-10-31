// Spec: odd/tasks/owner-ui-build.md, T4.1, L14 items 1, 2, 4, 5 and 6.
// The session is the framework-free core of useConversation. Every test builds its own
// service on a fake client, so state never leaks; failures and slow calls are injected
// by overriding single client methods.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OWNER_TEXT, POLISHED_TEXT, anaMessages } from "../../../shared/data/mock.ts";
import type { ChatView } from "../lib/chatView.ts";
import { createConversationsService, createFakeConversationsClient } from "../services/conversationsService.ts";
import type { ConversationsClient } from "../services/conversationsService.ts";
import { createConversationSession } from "./conversationSession.ts";

const SENT_AT = "2026-10-28T00:08:00-05:00";
const ANA_THREAD_LENGTH = anaMessages.length;

function buildSession(overrides: Partial<ConversationsClient> = {}, id = "c_ana") {
  let sentCount = 0;
  const client = { ...createFakeConversationsClient(), ...overrides };
  const service = createConversationsService(client, { now: () => SENT_AT, newMessageId: () => `m_new_${++sentCount}` });
  return createConversationSession(service, id);
}

async function loadedSession(overrides: Partial<ConversationsClient> = {}, id = "c_ana") {
  const session = buildSession(overrides, id);
  await session.load();
  return session;
}

function chatOf(session: ReturnType<typeof buildSession>): ChatView {
  const snapshot = session.getSnapshot();
  assert.equal(snapshot.status, "ready");
  return (snapshot as { status: "ready"; chat: ChatView }).chat;
}

function threadTexts(session: ReturnType<typeof buildSession>) {
  return chatOf(session).thread.map((message) => message.text);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

// Rejects the first call only, so a retry can succeed.
function failingOnce<Args extends unknown[], Result>(call: (...args: Args) => Promise<Result>) {
  let failed = false;
  return async (...args: Args) => {
    if (!failed) {
      failed = true;
      throw new Error("network down");
    }
    return call(...args);
  };
}

describe("session load", () => {
  it("is loading before load() is called", () => {
    assert.deepEqual(buildSession().getSnapshot(), { status: "loading" });
  });

  it("loads Ana's chat: names, accept time, thread, and an idle composer with polish off", async () => {
    const chat = chatOf(await loadedSession());

    assert.equal(chat.customerName, "Ana L.");
    assert.equal(chat.customerFirstName, "Ana");
    assert.equal(chat.acceptedAt, anaMessages[0].sentAt);
    assert.equal(chat.thread.length, ANA_THREAD_LENGTH);
    assert.equal(chat.step, "composing");
    assert.equal(chat.preview, null);
    assert.equal(chat.polishEnabled, false);
    assert.equal(chat.polishFailed, false);
    assert.equal(chat.sendFailed, false);
  });

  it("reports not_found for an unknown id", async () => {
    const session = await loadedSession({}, "nope");

    assert.deepEqual(session.getSnapshot(), { status: "not_found" });
  });

  it("an empty thread has no accept time instead of an empty string", async () => {
    const chat = chatOf(await loadedSession({}, "c_carlos"));

    assert.equal(chat.acceptedAt, null);
    assert.deepEqual(chat.thread, []);
    assert.equal(chat.customerName, "Carlos M.");
  });

  it("reports failed, not not_found, when finding the conversation rejects", async () => {
    const session = await loadedSession({ findConversation: async () => Promise.reject(new Error("network down")) });

    assert.deepEqual(session.getSnapshot(), { status: "failed" });
  });

  it("reports failed when listing the messages rejects", async () => {
    const session = await loadedSession({ listMessages: async () => Promise.reject(new Error("network down")) });

    assert.deepEqual(session.getSnapshot(), { status: "failed" });
  });

  it("retrying after a failed load shows loading and then the chat", async () => {
    const session = buildSession({ findConversation: failingOnce(createFakeConversationsClient().findConversation) });
    await session.load();
    assert.deepEqual(session.getSnapshot(), { status: "failed" });

    const retry = session.load();
    assert.deepEqual(session.getSnapshot(), { status: "loading" });
    await retry;

    assert.equal(chatOf(session).customerName, "Ana L.");
  });

  it("ignores a load that finishes after dispose: no state change, no notification", async () => {
    const slowConversation = deferred<Awaited<ReturnType<ConversationsClient["findConversation"]>>>();
    const session = buildSession({ findConversation: () => slowConversation.promise });
    let notifications = 0;
    session.subscribe(() => notifications++);

    const loading = session.load();
    const notificationsWhileLoading = notifications;
    session.dispose();
    slowConversation.resolve(await createFakeConversationsClient().findConversation("c_ana"));
    await loading;

    assert.deepEqual(session.getSnapshot(), { status: "loading" });
    assert.equal(notifications, notificationsWhileLoading);
  });
});

describe("session subscription", () => {
  it("returns the same snapshot object until something changes", async () => {
    const session = await loadedSession();

    assert.equal(session.getSnapshot(), session.getSnapshot());
  });

  it("notifies subscribers when the state changes and stops after unsubscribe", async () => {
    const session = await loadedSession();
    let notifications = 0;
    const unsubscribe = session.subscribe(() => notifications++);

    session.setPolishEnabled(true);
    assert.ok(notifications > 0);

    unsubscribe();
    const before = notifications;
    session.setPolishEnabled(false);
    assert.equal(notifications, before);
  });
});

describe("session send with polish off", () => {
  it("delivers the text as written exactly once and moves to sent", async () => {
    const session = await loadedSession();

    const outcome = await session.send(OWNER_TEXT);

    const chat = chatOf(session);
    assert.equal(outcome, "sent");
    assert.equal(chat.step, "sent");
    assert.equal(chat.thread.length, ANA_THREAD_LENGTH + 1);
    const sent = chat.thread.at(-1);
    assert.equal(sent?.text, OWNER_TEXT);
    assert.equal(sent?.from, "owner");
    assert.equal(sent?.delivery, "as_written");
    assert.equal(sent?.deliveryLabel, "sent as written");
  });

  it("a second send while the first is in flight sends nothing and does not clear the first", async () => {
    const session = await loadedSession();

    const [first, second] = await Promise.all([session.send("first"), session.send("second")]);

    assert.equal(first, "sent");
    assert.equal(second, "not_sent");
    assert.deepEqual(threadTexts(session).slice(ANA_THREAD_LENGTH), ["first"]);
  });

  it("a rejected send reports send_failed, appends nothing and keeps the composer usable", async () => {
    const session = await loadedSession({ saveMessage: failingOnce(async () => {}) });

    const outcome = await session.send(OWNER_TEXT);

    const chat = chatOf(session);
    assert.equal(outcome, "send_failed");
    assert.equal(chat.thread.length, ANA_THREAD_LENGTH);
    assert.equal(chat.step, "composing");
    assert.equal(chat.sendFailed, true);
    assert.equal(chat.polishFailed, false);
  });

  it("retrying after a rejected send delivers it once and clears the failure", async () => {
    const session = await loadedSession({ saveMessage: failingOnce(async () => {}) });
    await session.send(OWNER_TEXT);

    const outcome = await session.send(OWNER_TEXT);

    const chat = chatOf(session);
    assert.equal(outcome, "sent");
    assert.equal(chat.sendFailed, false);
    assert.deepEqual(threadTexts(session).slice(ANA_THREAD_LENGTH), [OWNER_TEXT]);
  });
});

describe("session send with polish on", () => {
  async function comparingSession(overrides: Partial<ConversationsClient> = {}) {
    const session = await loadedSession(overrides);
    session.setPolishEnabled(true);
    assert.equal(await session.send(OWNER_TEXT), "comparing");
    return session;
  }

  it("answers comparing with Zukki's preview and appends nothing yet", async () => {
    const chat = chatOf(await comparingSession());

    assert.equal(chat.step, "comparing");
    assert.deepEqual(chat.preview, { original: OWNER_TEXT, polished: POLISHED_TEXT, language: "English" });
    assert.equal(chat.thread.length, ANA_THREAD_LENGTH);
  });

  it("a polish that rejects reports polish_failed, appends nothing and goes back to composing", async () => {
    const session = await loadedSession({ polish: async () => Promise.reject(new Error("timeout")) });
    session.setPolishEnabled(true);

    const outcome = await session.send(OWNER_TEXT);

    const chat = chatOf(session);
    assert.equal(outcome, "polish_failed");
    assert.equal(chat.step, "composing");
    assert.equal(chat.polishFailed, true);
    assert.equal(chat.sendFailed, false);
    assert.equal(chat.thread.length, ANA_THREAD_LENGTH);
  });

  it("a second send while polishing runs one polish and answers not_sent", async () => {
    let polishCalls = 0;
    const session = await loadedSession({
      polish: async (text) => {
        polishCalls++;
        return { original: text, polished: POLISHED_TEXT, language: "English" };
      },
    });
    session.setPolishEnabled(true);

    const [first, second] = await Promise.all([session.send(OWNER_TEXT), session.send("again")]);

    assert.equal(first, "comparing");
    assert.equal(second, "not_sent");
    assert.equal(polishCalls, 1);
  });

  it("Send Zukki's appends the polished message with the owner's draft, once, and moves to sent", async () => {
    const session = await comparingSession();

    await session.sendChoice("zukki");

    const chat = chatOf(session);
    assert.equal(chat.step, "sent");
    assert.equal(chat.preview, null);
    assert.equal(chat.thread.length, ANA_THREAD_LENGTH + 1);
    const sent = chat.thread.at(-1);
    assert.equal(sent?.text, POLISHED_TEXT);
    assert.equal(sent?.delivery, "polished");
    assert.equal(sent?.ownerDraft, OWNER_TEXT);
    assert.equal(sent?.deliveryLabel, "Written with Zukki, approved by Northside");
  });

  it("Send mine appends the original text as written, once", async () => {
    const session = await comparingSession();

    await session.sendChoice("mine");

    const sent = chatOf(session).thread.at(-1);
    assert.equal(chatOf(session).thread.length, ANA_THREAD_LENGTH + 1);
    assert.equal(sent?.text, OWNER_TEXT);
    assert.equal(sent?.delivery, "as_written");
  });

  it("a double tap on the choice buttons appends only the first choice", async () => {
    const session = await comparingSession();

    await Promise.all([session.sendChoice("mine"), session.sendChoice("zukki")]);

    assert.deepEqual(threadTexts(session).slice(ANA_THREAD_LENGTH), [OWNER_TEXT]);
    assert.equal(chatOf(session).step, "sent");
  });

  it("a tap on a choice outside the comparison sends nothing", async () => {
    const session = await loadedSession();

    await session.sendChoice("zukki");

    assert.equal(chatOf(session).thread.length, ANA_THREAD_LENGTH);
    assert.equal(chatOf(session).step, "composing");
  });

  it("a rejected choice keeps the comparison and the preview, flags sendFailed and appends nothing", async () => {
    const session = await comparingSession({ saveMessage: failingOnce(async () => {}) });

    await session.sendChoice("zukki");

    const chat = chatOf(session);
    assert.equal(chat.step, "comparing");
    assert.equal(chat.preview?.polished, POLISHED_TEXT);
    assert.equal(chat.sendFailed, true);
    assert.equal(chat.thread.length, ANA_THREAD_LENGTH);
  });

  it("choosing again after a rejected choice appends once and clears the failure", async () => {
    const session = await comparingSession({ saveMessage: failingOnce(async () => {}) });
    await session.sendChoice("zukki");

    await session.sendChoice("zukki");

    const chat = chatOf(session);
    assert.equal(chat.step, "sent");
    assert.equal(chat.sendFailed, false);
    assert.deepEqual(threadTexts(session).slice(ANA_THREAD_LENGTH), [POLISHED_TEXT]);
  });
});

describe("session polish switch", () => {
  it("changing the switch clears a polish failure", async () => {
    const session = await loadedSession({ polish: async () => Promise.reject(new Error("timeout")) });
    session.setPolishEnabled(true);
    await session.send(OWNER_TEXT);
    assert.equal(chatOf(session).polishFailed, true);

    session.setPolishEnabled(false);

    assert.equal(chatOf(session).polishFailed, false);
    assert.equal(chatOf(session).polishEnabled, false);
  });

  it("changing the switch clears a send failure", async () => {
    const session = await loadedSession({ saveMessage: failingOnce(async () => {}) });
    await session.send(OWNER_TEXT);
    assert.equal(chatOf(session).sendFailed, true);

    session.setPolishEnabled(true);

    assert.equal(chatOf(session).sendFailed, false);
    assert.equal(chatOf(session).polishEnabled, true);
  });
});

describe("session dispose", () => {
  it("a send that finishes after dispose does not notify subscribers", async () => {
    const slowSave = deferred<void>();
    const session = await loadedSession({ saveMessage: () => slowSave.promise });
    let notifications = 0;
    session.subscribe(() => notifications++);

    const sending = session.send(OWNER_TEXT);
    const notificationsWhileSending = notifications;
    session.dispose();
    slowSave.resolve();
    await sending;

    assert.equal(notifications, notificationsWhileSending);
  });
});
