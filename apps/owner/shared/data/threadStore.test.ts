// Spec: docs/HANDOFF-OWNER-APP.md, T5.2 assignment, test group 2 and the operator decision "a
// module-level demo thread store holding the conversations' messages, with a reset for tests, like
// resetSharedDemoJobsService". No React: the store is plain functions.
// Names (open question Q5): createThreadStore() (independent, seeded), sharedThreadStore() (the one
// module-level store), resetSharedThreadStore() (back to the seed).
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { OWNER_TEXT, anaMessages } from "./mock.ts";
import type { Message } from "./types.ts";
import { createThreadStore, resetSharedThreadStore, sharedThreadStore } from "./threadStore.ts";

beforeEach(() => resetSharedThreadStore());

const ownerReply: Message = {
  id: "m_sent_1",
  from: "owner",
  text: OWNER_TEXT,
  sentAt: "2026-10-28T00:08:00-05:00",
  delivery: "as_written",
};

describe("thread store seed", () => {
  it("starts Ana's thread with Zukki's summary and her question, and every other conversation empty", () => {
    const store = createThreadStore();

    assert.deepEqual(store.messages("c_ana"), anaMessages);
    assert.deepEqual(store.messages("c_carlos"), []);
    assert.deepEqual(store.messages("nope"), []);
  });
});

describe("sharedThreadStore", () => {
  it("shows a message appended through one consumer to the next read of another", () => {
    const chatsSide = sharedThreadStore();
    const jobsSide = sharedThreadStore();

    jobsSide.append("c_ana", ownerReply);

    assert.deepEqual(chatsSide.messages("c_ana"), [...anaMessages, ownerReply]);
    assert.deepEqual(sharedThreadStore().messages("c_ana"), [...anaMessages, ownerReply]);
  });

  it("starts the next consumer from the seed after a reset", () => {
    sharedThreadStore().append("c_ana", ownerReply);
    sharedThreadStore().append("c_carlos", ownerReply);

    resetSharedThreadStore();

    assert.deepEqual(sharedThreadStore().messages("c_ana"), anaMessages);
    assert.deepEqual(sharedThreadStore().messages("c_carlos"), []);
  });
});

describe("createThreadStore", () => {
  it("hands out independent stores: an append in one is invisible to another and to the shared one", () => {
    const first = createThreadStore();
    const second = createThreadStore();

    first.append("c_ana", ownerReply);

    assert.deepEqual(second.messages("c_ana"), anaMessages);
    assert.deepEqual(sharedThreadStore().messages("c_ana"), anaMessages);
  });
});
