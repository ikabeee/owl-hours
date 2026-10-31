// Spec: odd/tasks/owner-notification-test-zukki.md T4 (S4, S10). The push content
// builder turns a request into the Expo push payload: the urgent title and body come
// verbatim from OwNotification, non-urgent bodies name 30 minutes, data carries the
// request id and the category, and the payload never carries the address.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildRequestPush } from "../src/services/owner-push.ts";

describe("buildRequestPush", () => {
  it("builds the urgent push: verbatim title and body, request id, category, channel", () => {
    const payload = buildRequestPush({
      requestId: "req_ana",
      title: "leaking toilet",
      summary: "Water is spreading.",
      distanceKm: 1.2,
      urgent: true,
      thumbnailUrl: "https://example.supabase.co/storage/bath-leak",
    });

    assert.equal(payload.title, "Urgent: leaking toilet, 1.2 km");
    assert.equal(payload.body, "Water is spreading. Accept within 5 minutes or Zukki offers it to another business.");
    assert.deepEqual(payload.data, { requestId: "req_ana", category: "request" });
    assert.equal(payload.channelId, "Urgent requests");
    assert.equal(payload.image, "https://example.supabase.co/storage/bath-leak");
  });

  it("names 30 minutes for a non-urgent request", () => {
    const payload = buildRequestPush({
      requestId: "req_carlos",
      title: "kitchen sink clogged",
      summary: "The drain is slow.",
      distanceKm: 2,
      urgent: false,
      thumbnailUrl: null,
    });

    assert.equal(payload.title, "kitchen sink clogged, 2 km");
    assert.equal(payload.body, "The drain is slow. Accept within 30 minutes or Zukki offers it to another business.");
    assert.equal(payload.image, null);
  });

  it("never carries the address", () => {
    const payload = buildRequestPush({
      requestId: "req_ana",
      title: "leaking toilet",
      summary: "Water is spreading.",
      distanceKm: 1.2,
      urgent: true,
      thumbnailUrl: null,
    });

    const serialized = JSON.stringify(payload);
    assert.doesNotMatch(serialized, /Palm Ave/);
    assert.ok(!("address" in payload.data), "data has no address field");
  });
});
