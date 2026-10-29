// Spec: odd/tasks/owner-ui-build.md, T4.1, L14 items 1, 2 and 5.
// The composer machine is pure: every test folds events over the initial state.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { PolishPreview } from "../../../shared/data/types.ts";
import { canStartChoice, canStartSend, composerReducer, initialComposerState } from "./composerMachine.ts";
import type { ComposerEvent, ComposerState } from "./composerMachine.ts";

const preview: PolishPreview = { original: "ok mario there 12:55", polished: "Mario will be there at 12:55.", language: "English" };

function fold(...events: ComposerEvent[]): ComposerState {
  return events.reduce(composerReducer, initialComposerState);
}

const polishOn: ComposerEvent = { type: "polish_switched", enabled: true };
function comparingState() {
  return fold(polishOn, { type: "send_started" }, { type: "preview_received", preview });
}

describe("composerReducer: start", () => {
  it("starts composing with the polish switch off, nothing failed and nothing in flight", () => {
    assert.deepEqual(initialComposerState, {
      step: "composing",
      preview: null,
      polishEnabled: false,
      polishFailed: false,
      sendFailed: false,
      isBusy: false,
    });
  });

  it("a plain send marks the composer busy and stays composing", () => {
    const state = fold({ type: "send_started" });

    assert.equal(state.step, "composing");
    assert.equal(state.isBusy, true);
  });

  it("a plain send started after a sent message goes back to composing", () => {
    const state = fold({ type: "send_started" }, { type: "message_sent" }, { type: "send_started" });

    assert.equal(state.step, "composing");
    assert.equal(state.isBusy, true);
  });

  it("a send with the polish switch on moves to polishing and marks the composer busy", () => {
    const state = fold(polishOn, { type: "send_started" });

    assert.equal(state.step, "polishing");
    assert.equal(state.isBusy, true);
  });

  it("starting a send clears the failures of the previous attempt", () => {
    const failedTwice = fold(polishOn, { type: "send_started" }, { type: "polish_failed" }, { type: "send_started" }, { type: "send_failed" });
    assert.equal(failedTwice.sendFailed, true);

    const retried = composerReducer(failedTwice, { type: "send_started" });

    assert.equal(retried.polishFailed, false);
    assert.equal(retried.sendFailed, false);
  });
});

describe("composerReducer: results", () => {
  it("a preview moves to comparing, keeps the preview and frees the composer", () => {
    const state = comparingState();

    assert.equal(state.step, "comparing");
    assert.deepEqual(state.preview, preview);
    assert.equal(state.isBusy, false);
  });

  it("a polish failure goes back to composing with polishFailed, no sendFailed, and frees the composer", () => {
    const state = fold(polishOn, { type: "send_started" }, { type: "polish_failed" });

    assert.equal(state.step, "composing");
    assert.equal(state.preview, null);
    assert.equal(state.polishFailed, true);
    assert.equal(state.sendFailed, false);
    assert.equal(state.isBusy, false);
  });

  it("a rejected plain send goes back to composing with sendFailed, no polishFailed, and frees the composer", () => {
    const state = fold({ type: "send_started" }, { type: "send_failed" });

    assert.equal(state.step, "composing");
    assert.equal(state.sendFailed, true);
    assert.equal(state.polishFailed, false);
    assert.equal(state.isBusy, false);
  });

  it("a rejected choice stays on the comparison, keeps the preview, flags sendFailed and frees the composer", () => {
    const state = composerReducer(composerReducer(comparingState(), { type: "choice_started" }), { type: "send_failed" });

    assert.equal(state.step, "comparing");
    assert.deepEqual(state.preview, preview);
    assert.equal(state.sendFailed, true);
    assert.equal(state.isBusy, false);
  });

  it("a send the service did not take goes back to composing with no failure flag", () => {
    const state = fold({ type: "send_started" }, { type: "nothing_sent" });

    assert.equal(state.step, "composing");
    assert.equal(state.sendFailed, false);
    assert.equal(state.polishFailed, false);
    assert.equal(state.isBusy, false);
  });

  it("a delivered message ends in sent, drops the preview and frees the composer", () => {
    const state = composerReducer(composerReducer(comparingState(), { type: "choice_started" }), { type: "message_sent" });

    assert.equal(state.step, "sent");
    assert.equal(state.preview, null);
    assert.equal(state.isBusy, false);
  });

  it("the polish switch survives a whole polished send", () => {
    const state = composerReducer(composerReducer(comparingState(), { type: "choice_started" }), { type: "message_sent" });

    assert.equal(state.polishEnabled, true);
  });
});

describe("composerReducer: polish switch", () => {
  it("sets the switch and clears both failures", () => {
    const failed = fold(polishOn, { type: "send_started" }, { type: "polish_failed" });

    const state = composerReducer(failed, { type: "polish_switched", enabled: false });

    assert.equal(state.polishEnabled, false);
    assert.equal(state.polishFailed, false);
    assert.equal(state.sendFailed, false);
  });

  it("clears a send failure too", () => {
    const failed = fold({ type: "send_started" }, { type: "send_failed" });

    assert.equal(composerReducer(failed, polishOn).sendFailed, false);
  });
});

describe("in-flight guard", () => {
  it("allows a send when idle, also after a failure or a sent message", () => {
    assert.equal(canStartSend(initialComposerState), true);
    assert.equal(canStartSend(fold({ type: "send_started" }, { type: "send_failed" })), true);
    assert.equal(canStartSend(fold({ type: "send_started" }, { type: "message_sent" })), true);
  });

  it("refuses a second send while one is in flight, with or without polish", () => {
    assert.equal(canStartSend(fold({ type: "send_started" })), false);
    assert.equal(canStartSend(fold(polishOn, { type: "send_started" })), false);
  });

  it("a send started while another is in flight leaves the state untouched", () => {
    const busy = fold({ type: "send_started" });

    assert.equal(composerReducer(busy, { type: "send_started" }), busy);
  });

  it("allows a choice only while comparing and idle", () => {
    assert.equal(canStartChoice(comparingState()), true);
    assert.equal(canStartChoice(initialComposerState), false);
    assert.equal(canStartChoice(fold({ type: "send_started" }, { type: "message_sent" })), false);
  });

  it("refuses a second choice while one is in flight", () => {
    const choosing = composerReducer(comparingState(), { type: "choice_started" });

    assert.equal(choosing.isBusy, true);
    assert.equal(choosing.step, "comparing");
    assert.deepEqual(choosing.preview, preview);
    assert.equal(canStartChoice(choosing), false);
    assert.equal(composerReducer(choosing, { type: "choice_started" }), choosing);
  });

  it("allows choosing again after a rejected choice", () => {
    const rejected = composerReducer(composerReducer(comparingState(), { type: "choice_started" }), { type: "send_failed" });

    assert.equal(canStartChoice(rejected), true);
  });
});
