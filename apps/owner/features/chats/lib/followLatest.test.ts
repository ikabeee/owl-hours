// L20: the owner's own message must always come into view after Send,
// even when the transcript stopped following (keyboard or dock resize).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Sender } from "../../../shared/data/types.ts";
import { arrivedOwnMessage } from "./followLatest.ts";

function messageFrom(id: string, from: Sender) {
  return { id, from };
}

describe("arrivedOwnMessage", () => {
  const seed = [messageFrom("m1", "zukki"), messageFrom("m2", "customer")];

  it("is true when the owner's message becomes the last one", () => {
    assert.equal(arrivedOwnMessage("m2", [...seed, messageFrom("m3", "owner")]), true);
  });

  it("is false when the new last message is the customer's", () => {
    assert.equal(arrivedOwnMessage("m2", [...seed, messageFrom("m3", "customer")]), false);
  });

  it("is false when the last message did not change", () => {
    assert.equal(arrivedOwnMessage("m2", seed), false);
  });

  it("is false on the first render, which the layout positions itself", () => {
    assert.equal(arrivedOwnMessage(undefined, [...seed, messageFrom("m3", "owner")]), false);
  });

  it("is false for an empty thread", () => {
    assert.equal(arrivedOwnMessage("m2", []), false);
  });
});
