// Test Zukki: answers only from the signed-in business's data and has no
// way to search other businesses or message a customer.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ChatChoice, ChatRequest } from "@owl-hours/meta-models";
import { askTestZukki, createTestZukkiTools } from "../src/agent/test-zukki.ts";
import type { BusinessProfile, PriceRuleRow } from "../src/db/repository.ts";

const NORTHSIDE = "10000000-0000-4000-8000-000000000001";
const EASTSIDE = "10000000-0000-4000-8000-000000000002";

function fakeRepo() {
  const reads: string[] = [];
  return {
    reads,
    repo: {
      getBusinessProfile: async (id: string): Promise<BusinessProfile | null> => {
        reads.push(`profile:${id}`);
        return null;
      },
      getPriceRules: async (id: string) => {
        reads.push(`prices:${id}`);
        return [
          { item: "Visit", kind: "callout", min: 45, max: 45, currency: "USD", conditions: null },
          { item: "Leak repair", kind: "repair_range", min: 60, max: 90, currency: "USD", conditions: null },
        ] satisfies PriceRuleRow[];
      },
    },
  };
}

function toolCall(name: string, args: string): ChatChoice {
  return {
    finishReason: "tool_calls",
    message: { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name, arguments: args } }] },
  };
}

describe("Test Zukki", () => {
  it("has only read tools for the signed-in business", () => {
    const names = createTestZukkiTools(NORTHSIDE, fakeRepo().repo).map((tool) => tool.name);
    assert.deepEqual(names, ["get_business_profile", "get_price_rules"]);
  });

  it("ignores a business id the model tries to pass", async () => {
    const [, prices] = createTestZukkiTools(NORTHSIDE, fakeRepo().repo);
    assert.equal(prices?.input.safeParse({ business_id: EASTSIDE }).success, false);
  });

  it("answers from the bound business's prices", async () => {
    const { repo, reads } = fakeRepo();
    const requests: ChatRequest[] = [];
    const answers = [
      toolCall("get_price_rules", '{"item":"leak"}'),
      { finishReason: "stop", message: { role: "assistant", content: "A leak repair is $60-90." } } satisfies ChatChoice,
    ];
    const result = await askTestZukki({
      tenantId: NORTHSIDE,
      question: "How much to fix a leak?",
      repo,
      chat: async (request) => {
        requests.push(structuredClone(request));
        return answers.shift() ?? { finishReason: "stop", message: { role: "assistant", content: "done" } };
      },
    });

    assert.equal(result.reply, "A leak repair is $60-90.");
    assert.deepEqual(reads, [`prices:${NORTHSIDE}`]);
    const toolResult = String(requests[1]?.messages.at(-1)?.content);
    assert.match(toolResult, /Leak repair/);
    assert.doesNotMatch(toolResult, /Visit/);
    assert.match(String(requests[0]?.messages[0]?.content), /nothing is sent to a customer/);
  });

  it("rejects empty or oversized questions before calling the model", async () => {
    let called = false;
    const chat = async () => {
      called = true;
      return { finishReason: "stop", message: { role: "assistant", content: "x" } } satisfies ChatChoice;
    };
    await assert.rejects(askTestZukki({ tenantId: NORTHSIDE, question: "  ", repo: fakeRepo().repo, chat }), /question/);
    await assert.rejects(askTestZukki({ tenantId: NORTHSIDE, question: "x".repeat(1001), repo: fakeRepo().repo, chat }), /question/);
    assert.equal(called, false);
  });
});
