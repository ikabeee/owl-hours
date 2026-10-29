// Pins where the request screen goes after Accept (L15): an accepted offer always leaves the screen.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { destinationAfterAccept } from "./acceptOutcome.ts";

describe("destinationAfterAccept", () => {
  it("opens the chat when the accepted offer has one", () => {
    assert.deepEqual(destinationAfterAccept({ kind: "accepted", chatId: "c_ana" }), { kind: "chat", chatId: "c_ana" });
  });

  it("falls back to the chats tab when the accepted offer has no chat", () => {
    assert.deepEqual(destinationAfterAccept({ kind: "accepted", chatId: null }), { kind: "chats-tab" });
  });

  it("stays on the request when the offer was no longer offered", () => {
    assert.deepEqual(destinationAfterAccept({ kind: "not-offered" }), { kind: "stay" });
  });
});
