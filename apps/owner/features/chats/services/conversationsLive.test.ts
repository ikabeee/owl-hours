// Live mode: chats come from the owner API's conversations and messages; option A posts the text,
// option B saves a draft for Zukki to polish and then sends the owner's pick.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createFakeOwnerApi } from "../../../lib/ownerApi.fake.ts";
import { createLiveConversationsService, toConversation } from "./conversationsLive.ts";
import type { ApiConversation } from "./conversationsLive.ts";

const chat: ApiConversation = {
  id: "c1",
  offerId: "h1",
  title: "Toilet won't stop running",
  customerName: "Ana L.",
  chatOpen: true,
  job: { id: "j1", state: "customer_approved", arrivalWindow: "12:55–1:25 AM" },
  lastMessage: { id: "m9", from: "customer", kind: "text", text: "Perfect, thanks", sentAt: "2026-10-31T16:10:00Z" },
  unread: 2,
};

describe("toConversation", () => {
  it("maps the chat row with a status line from its job", () => {
    assert.deepEqual(toConversation(chat), {
      id: "c1",
      offerId: "h1",
      customerName: "Ana L.",
      jobTitle: "Toilet won't stop running",
      statusLine: "visit 12:55–1:25 AM",
      unread: 2,
      lastMessage: { id: "m9", from: "customer", text: "Perfect, thanks", sentAt: "2026-10-31T16:10:00Z" },
    });
  });

  it("waits for the owner before a quote goes out", () => {
    const fresh = toConversation({ ...chat, job: { id: "j1", state: "proposed", arrivalWindow: null }, lastMessage: null });
    assert.equal(fresh.statusLine, "waiting for you");
    assert.equal(fresh.lastMessage.text, "");
  });
});

describe("live conversations service", () => {
  it("reads the thread, naming media and skipping empty rows", async () => {
    const { api } = createFakeOwnerApi({
      "GET /conversations?limit=100": [chat],
      "GET /conversations/c1/messages?limit=200": [
        { id: "a", from: "customer", kind: "media", text: null, sentAt: "t1", media: { kind: "audio", transcript: "It keeps running" } },
        { id: "b", from: "customer", kind: "media", text: null, sentAt: "t2", media: { kind: "video", transcript: null } },
        { id: "c", from: "zukki", kind: "text", text: "Request sent.", sentAt: "t3", media: null },
        { id: "d", from: "owner", kind: "text", text: "On my way", sentAt: "t4", delivery: "polished", media: null },
        { id: "e", from: "zukki", kind: "interactive", text: null, sentAt: "t5", media: null },
      ],
      "POST /conversations/c1/read": { conversationId: "c1" },
    });
    const messages = await createLiveConversationsService(api).getMessages("c1");
    assert.deepEqual(messages, [
      { id: "a", from: "customer", text: "Voice note: \"It keeps running\"", sentAt: "t1" },
      { id: "b", from: "customer", text: "Video", sentAt: "t2" },
      { id: "c", from: "zukki", text: "Request sent.", sentAt: "t3" },
      { id: "d", from: "owner", text: "On my way", sentAt: "t4", delivery: "polished" },
    ]);
  });

  it("sends option A as written", async () => {
    const { api, calls } = createFakeOwnerApi({
      "GET /conversations?limit=100": [chat],
      "POST /conversations/c1/messages": { id: "m10", sentAt: "t6", status: "queued", delivery: "as_written" },
    });
    const result = await createLiveConversationsService(api).sendMessage("c1", "Be there soon", { polish: false });
    assert.deepEqual(result, { sent: { id: "m10", from: "owner", text: "Be there soon", sentAt: "t6", delivery: "as_written" } });
    assert.deepEqual(calls.at(-1)?.body, { text: "Be there soon" });
  });

  it("polishes through a draft and sends the owner's pick", async () => {
    const { api, calls } = createFakeOwnerApi({
      "GET /conversations?limit=100": [chat],
      "POST /conversations/c1/drafts": { draftId: "d1", original: "omw", polished: "I'm on my way.", language: "English" },
      "POST /drafts/d1/send": { id: "m11", sentAt: "t7", status: "queued", delivery: "polished" },
    });
    const service = createLiveConversationsService(api);
    const preview = await service.sendMessage("c1", "omw", { polish: true });
    assert.deepEqual(preview, { original: "omw", polished: "I'm on my way.", language: "English" });
    const sent = await service.sendPolishChoice("c1", { original: "omw", polished: "I'm on my way.", language: "English" }, "zukki");
    assert.equal(sent?.text, "I'm on my way.");
    assert.equal(sent?.delivery, "polished");
    assert.deepEqual(calls.at(-1)?.body, { usePolished: true });
  });

  it("keeps the owner's words when Zukki could not polish", async () => {
    const { api } = createFakeOwnerApi({
      "GET /conversations?limit=100": [chat],
      "POST /conversations/c1/drafts": { draftId: "d2", original: "$95 ok", polished: null, language: null },
    });
    const preview = await createLiveConversationsService(api).sendMessage("c1", "$95 ok", { polish: true });
    assert.deepEqual(preview, { original: "$95 ok", polished: "$95 ok", language: "English" });
  });

  it("suggests the request's quote for the chat's job", async () => {
    const { api } = createFakeOwnerApi({
      "GET /conversations?limit=100": [chat, { ...chat, id: "c2", job: null }],
      "GET /offers/h1": { suggestedQuote: { min: 95, max: 125 } },
    });
    const service = createLiveConversationsService(api);
    assert.deepEqual(await service.getQuoteSuggestion("c1"), { jobId: "j1", suggestedQuote: { min: 95, max: 125 } });
    assert.equal(await service.getQuoteSuggestion("c2"), null);
  });

  it("has no chat the owner cannot see", async () => {
    const { api } = createFakeOwnerApi({ "GET /conversations?limit=100": [chat] });
    const service = createLiveConversationsService(api);
    assert.equal(await service.getConversation("other"), null);
    assert.equal(await service.getMessages("other"), null);
  });
});
