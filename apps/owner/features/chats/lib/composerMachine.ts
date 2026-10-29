// The composer state machine: composing → polishing → comparing → sent, with failures and an in-flight guard.
import type { PolishPreview } from "../../../shared/data/types.ts";
import type { ComposerStep } from "./chatView.ts";

export type ComposerState = {
  step: ComposerStep;
  preview: PolishPreview | null; // set only while step is "comparing"
  polishEnabled: boolean;
  polishFailed: boolean;
  sendFailed: boolean;
  isBusy: boolean; // a send or a polish choice is in flight
};

export type ComposerEvent =
  | { type: "send_started" }
  | { type: "preview_received"; preview: PolishPreview }
  | { type: "polish_failed" }
  | { type: "send_failed" }
  | { type: "nothing_sent" }
  | { type: "message_sent" }
  | { type: "choice_started" }
  | { type: "polish_switched"; enabled: boolean };

export const initialComposerState: ComposerState = {
  step: "composing",
  preview: null,
  polishEnabled: false,
  polishFailed: false,
  sendFailed: false,
  isBusy: false,
};

// A send or a choice starts only when nothing is in flight, so a double tap sends once.
export function canStartSend(state: ComposerState): boolean {
  return !state.isBusy;
}

// Only the comparison offers a choice, and only one at a time.
export function canStartChoice(state: ComposerState): boolean {
  return state.step === "comparing" && !state.isBusy;
}

// A refused start returns the very same state object.
export function composerReducer(state: ComposerState, event: ComposerEvent): ComposerState {
  switch (event.type) {
    case "send_started":
      return canStartSend(state) ? startSend(state) : state;
    case "choice_started":
      return canStartChoice(state) ? { ...state, sendFailed: false, isBusy: true } : state;
    case "preview_received":
      return { ...state, step: "comparing", preview: event.preview, isBusy: false };
    case "polish_failed":
      return { ...backToComposing(state), polishFailed: true };
    case "send_failed":
      return { ...settle(state), sendFailed: true };
    case "nothing_sent":
      return settle(state);
    case "message_sent":
      return { ...state, step: "sent", preview: null, sendFailed: false, isBusy: false };
    case "polish_switched":
      return { ...state, polishEnabled: event.enabled, polishFailed: false, sendFailed: false };
  }
}

function startSend(state: ComposerState): ComposerState {
  const step = state.polishEnabled ? "polishing" : "composing";
  return { ...state, step, polishFailed: false, sendFailed: false, isBusy: true };
}

function backToComposing(state: ComposerState): ComposerState {
  return { ...state, step: "composing", preview: null, isBusy: false };
}

// A rejected or refused choice keeps the comparison open; anything else returns to composing.
function settle(state: ComposerState): ComposerState {
  return state.step === "comparing" ? { ...state, isBusy: false } : backToComposing(state);
}
