// The quote bubble: what the owner sent, drawn as the WhatsApp message the customer receives.
import type { Message, Quote } from "../../../shared/data/types.ts";
import { quoteMessageBody } from "../../../shared/lib/quoteMessage.ts";
import { chatsCopys } from "../copys/chatsCopys.ts";

// Serializable by design: it crosses into the DOM component as props.
export type QuoteCard = {
  header: string;
  arrivalLine: string;
  lines: string[];
  totalLine: string; // the bubble draws it bold
  payLine: string;
  footer: string;
  replyLabels: string[]; // the customer's buttons, drawn as labels the owner cannot press
};

export function buildQuoteCard(quote: Quote, businessName: string): QuoteCard {
  return {
    header: `${chatsCopys.quoteFrom} ${businessName}`,
    ...quoteMessageBody(quote),
    footer: chatsCopys.quoteFooter,
    replyLabels: [chatsCopys.approveVisit, chatsCopys.askQuestion],
  };
}

// Without the business name the header cannot be written: the message shows as plain text.
export function quoteCardOf(message: Message, businessName: string | null): QuoteCard | null {
  return message.quote && businessName !== null ? buildQuoteCard(message.quote, businessName) : null;
}

export function hasSentQuote(messages: readonly Message[]): boolean {
  return messages.some((message) => message.quote !== undefined);
}
