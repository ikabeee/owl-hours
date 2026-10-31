import type { Quote } from "../data/types.ts";
import { arrivalWindowText } from "./arrivalWindow.ts";
import { firstName } from "./firstName.ts";
import { amountText, moneyRangeText } from "./moneyText.ts";

// The wording of the quote the customer receives on WhatsApp, quoted from
// handoff-ui/whatsapp/payloads/13-quote.json. Jobs writes it into the message text; chats draws it.
export const QUOTE_MESSAGE_WORDS = {
  arrives: "arrives",
  estimatedTotal: "Estimated total",
  youPay: "You pay",
  afterTheRepair: "after the repair.",
} as const;

// The body of the WhatsApp message, part by part. The total carries no asterisks: the bubble draws it bold.
export type QuoteMessageBody = {
  arrivalLine: string;
  lines: string[];
  totalLine: string;
  payLine: string;
};

export function quoteMessageBody(quote: Quote): QuoteMessageBody {
  return {
    arrivalLine: `${quote.technician} · ${QUOTE_MESSAGE_WORDS.arrives} ${arrivalWindowText(quote.arrival)}`,
    lines: quote.lines.map((line) => `${line.label}: ${amountText(line.amount)}`),
    totalLine: `${QUOTE_MESSAGE_WORDS.estimatedTotal}: ${moneyRangeText(quote.total)}`,
    payLine: `${QUOTE_MESSAGE_WORDS.youPay} ${firstName(quote.technician)} ${QUOTE_MESSAGE_WORDS.afterTheRepair}`,
  };
}

// The same body as plain lines, blank lines between the parts: the message `text`, what a chat list previews.
export function quoteMessageText(quote: Quote): string {
  const { arrivalLine, lines, totalLine, payLine } = quoteMessageBody(quote);
  return [arrivalLine, "", ...lines, totalLine, "", payLine].join("\n");
}
