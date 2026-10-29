// Spec: docs/HANDOFF-OWNER-APP.md, T4 assignment, test file 3.
// Strings come from handoff-ui/owner-app/design/html/OwChat.dc.html and
// OwChatPolish.dc.html; the polish states and the option B label come from
// HANDOFF-RN-UI.md section 8.
// The listed keys are every key the chat screen will render.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { chatsCopys } from "./chatsCopys.ts";

const expectedCopys = {
  // top bar and thread
  backLabel: "Back",
  viaZukkiWhatsApp: "via Zukki · WhatsApp",
  youAcceptedAt: "You accepted at",
  zukkiName: "Zukki",
  viewJobAndEvidence: "View job and evidence",
  // composer
  messageLabel: "Message",
  writeToPlaceholder: "Write to",
  sendLabel: "Send",
  polishSwitchLabel: "Polish with Zukki",
  // metadata under the owner bubble
  sentAsWritten: "sent as written",
  sentPolished: "Written with Zukki, approved by Northside",
  // PolishCompare
  youWrote: "You wrote",
  zukkiVersion: "Zukki's version · English, Ana's language",
  sendMine: "Send mine",
  sendZukkis: "Send Zukki's",
  // polish states
  polishing: "Polishing…",
  polishFailed: "Couldn't polish. Send yours or try again.",
};

describe("chatsCopys", () => {
  for (const [key, text] of Object.entries(expectedCopys)) {
    it(`${key} is "${text}"`, () => {
      assert.equal(chatsCopys[key as keyof typeof chatsCopys], text);
    });
  }

  it("has every referenced key", () => {
    const missing = Object.keys(expectedCopys).filter((key) => !(key in chatsCopys));

    assert.deepEqual(missing, []);
  });

  it("has no empty string among the referenced keys", () => {
    for (const key of Object.keys(expectedCopys)) {
      const text = chatsCopys[key] ?? "";
      assert.notEqual(text.trim(), "", `${key} is empty`);
    }
  });
});
