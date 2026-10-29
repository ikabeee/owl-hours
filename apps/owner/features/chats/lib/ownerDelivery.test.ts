// Spec: docs/HANDOFF-OWNER-APP.md, T4 assignment, test file 1 (the A/B delivery rule).
// Option A = sent as written, option B = polished by Zukki. Demo literals come from
// shared/data/mock.ts and handoff-ui/owner-app/design/html/OwChat.dc.html.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OWNER_TEXT, POLISHED_TEXT } from "../../../shared/data/mock.ts";
import type { Message, PolishPreview } from "../../../shared/data/types.ts";
import {
  buildAsWrittenMessage,
  buildChosenMessage,
  buildPolishedMessage,
  deliveryLabel,
} from "./ownerDelivery.ts";

const stamp = { id: "m_new", sentAt: "2026-10-28T00:08:00-05:00" };
const preview: PolishPreview = { original: OWNER_TEXT, polished: POLISHED_TEXT, language: "English" };

describe("buildAsWrittenMessage (option A)", () => {
  it("delivers the text exactly as written, with no owner draft", () => {
    const text = "  ok mario there 12:55 ,  bringing the valve  ";

    assert.deepEqual(buildAsWrittenMessage(stamp, text), {
      id: "m_new",
      from: "owner",
      text,
      sentAt: "2026-10-28T00:08:00-05:00",
      delivery: "as_written",
    });
  });
});

describe("buildPolishedMessage (option B)", () => {
  it("delivers Zukki's version and keeps what the owner typed as the draft", () => {
    assert.deepEqual(buildPolishedMessage(stamp, preview), {
      id: "m_new",
      from: "owner",
      text: POLISHED_TEXT,
      sentAt: "2026-10-28T00:08:00-05:00",
      delivery: "polished",
      ownerDraft: OWNER_TEXT,
    });
  });
});

describe("buildChosenMessage", () => {
  it("'Send Zukki's' builds the polished message", () => {
    assert.deepEqual(buildChosenMessage(stamp, preview, "zukki"), buildPolishedMessage(stamp, preview));
  });

  it("'Send mine' builds the original as option A, ignoring Zukki's version", () => {
    assert.deepEqual(buildChosenMessage(stamp, preview, "mine"), buildAsWrittenMessage(stamp, OWNER_TEXT));
  });
});

describe("deliveryLabel (metadata under the bubble)", () => {
  it('reads "sent as written" under an option A message', () => {
    assert.equal(deliveryLabel(buildAsWrittenMessage(stamp, OWNER_TEXT)), "sent as written");
  });

  it('reads "Written with Zukki, approved by Northside" under an option B message', () => {
    assert.equal(deliveryLabel(buildPolishedMessage(stamp, preview)), "Written with Zukki, approved by Northside");
  });

  it("is null under a customer message", () => {
    const customerMessage: Message = { id: "m2", from: "customer", text: "Hi, is someone coming tonight?", sentAt: stamp.sentAt };

    assert.equal(deliveryLabel(customerMessage), null);
  });
});
