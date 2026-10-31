import type { Conversation } from "../../../shared/data/types.ts";
import { chatsCopys } from "../copys/chatsCopys.ts";

// Serializable by design: it crosses into the DOM component as props.
export type ChatRowView = { id: string; title: string; subtitle: string; lastText: string; unread: number };

export function chatRow(conversation: Conversation): ChatRowView {
  return {
    id: conversation.id,
    title: conversation.customerName,
    subtitle: `${conversation.jobTitle} · ${conversation.statusLine}`,
    lastText: conversation.lastMessage.text || chatsCopys.noMessagesYet,
    unread: conversation.unread,
  };
}
