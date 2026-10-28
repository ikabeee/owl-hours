// Option B: Zukki rewrites the owner's message so it reads clearly. The
// owner always sees both versions and picks one. A version that drops or
// changes any number (price, time, address) is thrown away.
import { z } from "zod";
import type { ChatChoice, ChatRequest, ResponseFormat } from "@owl-hours/meta-models";

export const POLISH_SYSTEM_PROMPT = [
  "You rewrite a local business owner's WhatsApp message to a customer so it is clear, warm and professional.",
  "Keep every fact exactly as written: names, prices, times, dates, addresses and quantities. Never add a promise, price or time.",
  "Write in the same language as the owner. Keep it under 600 characters. No emoji.",
].join("\n");

const polishedSchema = z.object({
  language: z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/),
  text: z.string().trim().min(1).max(1024),
});

export type Polished = z.infer<typeof polishedSchema>;

const RESPONSE_FORMAT: ResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "polished_message",
    schema: {
      type: "object",
      properties: {
        language: { type: "string", description: "ISO 639-1 code of the owner's message, e.g. en, es" },
        text: { type: "string" },
      },
      required: ["language", "text"],
      additionalProperties: false,
    },
  },
};

function numbersIn(text: string): string[] {
  return [...text.matchAll(/\d+(?:[.,:]\d+)*/g)].map((match) => match[0]);
}

// True when every number in the original appears, unchanged, in the rewrite.
export function keepsEveryNumber(original: string, rewrite: string): boolean {
  const available = numbersIn(rewrite);
  return numbersIn(original).every((number) => {
    const index = available.indexOf(number);
    if (index === -1) {
      return false;
    }
    available.splice(index, 1);
    return true;
  });
}

export async function polishOwnerMessage(
  chat: (request: ChatRequest) => Promise<ChatChoice>,
  original: string,
): Promise<Polished | null> {
  const choice = await chat({
    messages: [
      { role: "system", content: POLISH_SYSTEM_PROMPT },
      { role: "user", content: original },
    ],
    responseFormat: RESPONSE_FORMAT,
    temperature: 0.3,
  });
  let raw: unknown;
  try {
    raw = JSON.parse(choice.message.content ?? "");
  } catch {
    return null;
  }
  const parsed = polishedSchema.safeParse(raw);
  if (!parsed.success || !keepsEveryNumber(original, parsed.data.text)) {
    return null;
  }
  return parsed.data;
}
