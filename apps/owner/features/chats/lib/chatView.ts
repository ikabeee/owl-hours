// Serializable shapes shared by the chat hook and the chat screen.
import type { Message, PolishPreview } from "../../../shared/data/types.ts";

// composing → polishing → comparing → sent; "sent" behaves like "composing" for the composer.
export type ComposerStep = "composing" | "polishing" | "comparing" | "sent";

// What the composer needs to know after Send: keep the draft only when nothing was sent or compared.
export type SendOutcome = "sent" | "comparing" | "polish_failed" | "send_failed" | "not_sent";

export type ThreadMessage = Message & { deliveryLabel: string | null };

// Serializable by design: it crosses into the DOM component as props.
export type ChatView = {
  customerName: string;
  customerFirstName: string;
  acceptedAt: string | null; // ISO instant of the first thread message; null while the thread is empty
  thread: ThreadMessage[];
  step: ComposerStep;
  preview: PolishPreview | null; // set only while step is "comparing"
  polishEnabled: boolean;
  polishFailed: boolean;
  sendFailed: boolean;
};

// A load can end in three different ways; the screen must tell them apart.
export type ConversationSnapshot = { status: "loading" | "not_found" | "failed" } | { status: "ready"; chat: ChatView };
