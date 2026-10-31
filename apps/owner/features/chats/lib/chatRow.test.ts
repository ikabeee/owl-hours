// The Chats list row: the customer, the job and where it stands, the last message and unread count.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { conversations } from "../../../shared/data/mock.ts";
import { chatRow } from "./chatRow.ts";

describe("chatRow", () => {
  it("shows the job, its status and the last message", () => {
    const ana = conversations[0];
    assert.deepEqual(chatRow(ana), {
      id: ana.id,
      title: ana.customerName,
      subtitle: `${ana.jobTitle} · ${ana.statusLine}`,
      lastText: ana.lastMessage.text,
      unread: ana.unread,
    });
  });

  it("says when nothing has been written yet", () => {
    const quiet = { ...conversations[0], lastMessage: { ...conversations[0].lastMessage, text: "" } };
    assert.equal(chatRow(quiet).lastText, "No messages yet");
  });
});
