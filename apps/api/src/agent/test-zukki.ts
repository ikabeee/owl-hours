// Test Zukki (owner app, business/test): the owner asks like a customer and
// sees what Zukki would answer from their own profile, prices and hours.
// The business comes from the owner's session, never from the model, and
// there are no tools that search other businesses or message anyone.
import { z } from "zod";
import type { ChatMessage, ChatChoice, ChatRequest } from "@owl-hours/meta-models";
import type { ZukkiRepository } from "../db/repository.ts";
import { runAgent } from "./run-agent.ts";
import { defineTool, type AgentTool } from "./tools.ts";

export const TEST_ZUKKI_SYSTEM_PROMPT = [
  "You are Zukki answering a practice question from the owner of the business you represent.",
  "Answer exactly as you would answer a customer on WhatsApp, using only this business's profile, prices and hours from your tools.",
  "Never invent prices, hours or arrival times. If the tools do not have the answer, say what is missing so the owner can add it.",
  "This chat is a preview: nothing is sent to a customer and nothing is booked.",
  "Keep replies short and plain.",
].join("\n");

export const MAX_TEST_QUESTION_LENGTH = 1000;

export function createTestZukkiTools(tenantId: string, repo: Pick<ZukkiRepository, "getBusinessProfile" | "getPriceRules">): AgentTool[] {
  return [
    defineTool({
      name: "get_business_profile",
      description: "Read this business's profile and opening hours.",
      input: z.object({}).strict(),
      run: async () => {
        const profile = await repo.getBusinessProfile(tenantId);
        if (!profile) {
          throw new Error("business not found");
        }
        return profile;
      },
    }),
    defineTool({
      name: "get_price_rules",
      description: "Read this business's price rules. Never quote a price that is not here.",
      input: z.object({ item: z.string().min(1).max(80).optional().describe("filter, e.g. leak") }).strict(),
      run: async ({ item }) => {
        const rules = await repo.getPriceRules(tenantId);
        const needle = item?.toLowerCase();
        return needle ? rules.filter((rule) => rule.item.toLowerCase().includes(needle)) : rules;
      },
    }),
  ];
}

export type TestZukkiInput = {
  // From the signed-in owner's session (tenant_users), not from the request body.
  tenantId: string;
  question: string;
  history?: { role: "user" | "assistant"; content: string }[];
  chat: (request: ChatRequest) => Promise<ChatChoice>;
  repo: Pick<ZukkiRepository, "getBusinessProfile" | "getPriceRules">;
};

export async function askTestZukki(input: TestZukkiInput): Promise<{ reply: string }> {
  const question = input.question.trim();
  if (!question || question.length > MAX_TEST_QUESTION_LENGTH) {
    throw new Error(`question must be 1-${MAX_TEST_QUESTION_LENGTH} characters`);
  }
  const messages: ChatMessage[] = [
    { role: "system", content: TEST_ZUKKI_SYSTEM_PROMPT },
    ...(input.history ?? []).slice(-10),
    { role: "user", content: question },
  ];
  return runAgent({ chat: input.chat, tools: createTestZukkiTools(input.tenantId, input.repo), messages });
}
