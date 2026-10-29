// The owner's two ways to send: option A (as written) and option B (polished by Zukki).
import type { ID, ISODate, Message, PolishPreview } from "../../../shared/data/types.ts";
import { chatsCopys } from "../copys/chatsCopys.ts";

export type MessageStamp = { id: ID; sentAt: ISODate };
export type PolishChoice = "mine" | "zukki";

const DELIVERY_LABELS = {
  as_written: chatsCopys.sentAsWritten,
  polished: chatsCopys.sentPolished,
} as const;

export function buildAsWrittenMessage({ id, sentAt }: MessageStamp, text: string): Message {
  return { id, from: "owner", text, sentAt, delivery: "as_written" };
}

export function buildPolishedMessage({ id, sentAt }: MessageStamp, preview: PolishPreview): Message {
  return { id, from: "owner", text: preview.polished, sentAt, delivery: "polished", ownerDraft: preview.original };
}

// "Send mine" is option A applied to the original; "Send Zukki's" is option B.
export function buildChosenMessage(stamp: MessageStamp, preview: PolishPreview, choice: PolishChoice): Message {
  return choice === "zukki"
    ? buildPolishedMessage(stamp, preview)
    : buildAsWrittenMessage(stamp, preview.original);
}

// The metadata under an owner bubble; other senders carry none.
export function deliveryLabel(message: Message): string | null {
  if (message.from !== "owner" || !message.delivery) return null;
  return DELIVERY_LABELS[message.delivery];
}
