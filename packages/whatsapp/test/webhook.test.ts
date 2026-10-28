import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseWebhook } from "../src/index.ts";

const wrap = (value: Record<string, unknown>) => ({
  object: "whatsapp_business_account",
  entry: [{ id: "WABA", changes: [{ field: "messages", value: { messaging_product: "whatsapp", ...value } }] }],
});

const contacts = [{ wa_id: "15551234567", profile: { name: "Ana Lopez" } }];
const base = { from: "15551234567", timestamp: "1761696000" };

describe("parseWebhook", () => {
  it("reads text, replies, location and media", () => {
    const { events, skipped } = parseWebhook(
      wrap({
        contacts,
        messages: [
          { ...base, id: "wamid.1", type: "text", text: { body: "My toilet is leaking" } },
          { ...base, id: "wamid.2", type: "interactive", interactive: { type: "button_reply", button_reply: { id: "quote_approve:q1", title: "Approve visit" } } },
          { ...base, id: "wamid.3", type: "interactive", interactive: { type: "list_reply", list_reply: { id: "cat_plumbing", title: "Plumbing" } } },
          { ...base, id: "wamid.4", type: "location", location: { latitude: 41.88, longitude: -87.63, address: "1 Main St" } },
          { ...base, id: "wamid.5", type: "video", video: { id: "MEDIA5", mime_type: "video/mp4", caption: "here" } },
          { ...base, id: "wamid.6", type: "audio", audio: { id: "MEDIA6", mime_type: "audio/ogg; codecs=opus" } },
          { ...base, id: "wamid.7", type: "sticker", sticker: { id: "S" } },
        ],
      }),
    );
    assert.equal(skipped, 0);
    assert.equal(events.length, 7);
    assert.deepEqual(events[0], {
      type: "message",
      waId: "15551234567",
      profileName: "Ana Lopez",
      waMessageId: "wamid.1",
      receivedAt: "2025-10-29T00:00:00.000Z",
      content: { kind: "text", text: "My toilet is leaking" },
    });
    const contents = events.map((e) => (e.type === "message" ? e.content : null));
    assert.deepEqual(contents[1], { kind: "button_reply", id: "quote_approve:q1", title: "Approve visit" });
    assert.deepEqual(contents[2], { kind: "list_reply", id: "cat_plumbing", title: "Plumbing" });
    assert.deepEqual(contents[3], { kind: "location", latitude: 41.88, longitude: -87.63, address: "1 Main St" });
    assert.deepEqual(contents[4], { kind: "media", mediaType: "video", waMediaId: "MEDIA5", mimeType: "video/mp4", caption: "here" });
    assert.deepEqual(contents[5], { kind: "media", mediaType: "audio", waMediaId: "MEDIA6", mimeType: "audio/ogg; codecs=opus", caption: null });
    assert.deepEqual(contents[6], { kind: "unsupported", type: "sticker" });
  });

  it("reads delivery statuses and skips ones we do not track", () => {
    const { events, skipped } = parseWebhook(
      wrap({
        statuses: [
          { id: "wamid.OUT", status: "delivered", recipient_id: "15551234567", timestamp: "1" },
          { id: "wamid.OUT", status: "deleted" },
        ],
      }),
    );
    assert.deepEqual(events, [{ type: "status", waMessageId: "wamid.OUT", status: "delivered", recipientWaId: "15551234567" }]);
    assert.equal(skipped, 1);
  });

  it("ignores other objects and malformed messages", () => {
    assert.deepEqual(parseWebhook({ object: "page", entry: [] }), { events: [], skipped: 1 });
    assert.deepEqual(parseWebhook(null), { events: [], skipped: 1 });
    const { events, skipped } = parseWebhook(wrap({ messages: [{ from: "+1 555", id: "x", timestamp: "1", type: "text" }] }));
    assert.deepEqual([events.length, skipped], [0, 1]);
  });
});
