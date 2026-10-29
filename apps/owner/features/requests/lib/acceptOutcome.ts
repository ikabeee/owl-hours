import type { ID } from "../../../shared/data/types.ts";

// What happened when the owner pressed Accept.
export type AcceptOutcome =
  | { kind: "not-offered" } // the offer was no longer "offered"; nothing changed
  | { kind: "accepted"; chatId: ID | null }; // chatId is null when no chat maps to the offer

// Where the request screen sends the owner next.
export type AcceptDestination = { kind: "stay" } | { kind: "chat"; chatId: ID } | { kind: "chats-tab" };

// An accepted offer always leaves the request screen; only a refused accept stays.
export function destinationAfterAccept(outcome: AcceptOutcome): AcceptDestination {
  if (outcome.kind === "not-offered") return { kind: "stay" };
  if (outcome.chatId === null) return { kind: "chats-tab" };

  return { kind: "chat", chatId: outcome.chatId };
}
