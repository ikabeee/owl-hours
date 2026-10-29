// Serializable shapes shared by the chat hook and the chat screen.
import type { Message } from "../../../shared/data/types.ts";

// composing → polishing → comparing → sent; "sent" behaves like "composing" for the composer.
export type ComposerStep = "composing" | "polishing" | "comparing" | "sent";

// What the composer needs to know after Send: keep the draft only when nothing was sent or compared.
export type SendOutcome = "sent" | "comparing" | "polish_failed" | "not_sent";

export type ThreadMessage = Message & { deliveryLabel: string | null };
