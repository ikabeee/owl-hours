// Spec: odd/tasks/owner-notification-test-zukki.md T4 (S6 API). `sources` holds
// the `item` of every price rule the price tool RETURNED to the model: when the
// tool filtered by `item`, only the matching rules count.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ChatChoice } from "@owl-hours/meta-models";
import { askTestZukki } from "../src/agent/test-zukki.ts";
import type { BusinessProfile, PriceRuleRow } from "../src/db/repository.ts";

const NORTHSIDE = "10000000-0000-4000-8000-000000000001";

function toolCall(name: string, args: string): ChatChoice {
  return {
    finishReason: "tool_calls",
    message: { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name, arguments: args } }] },
  };
}

function stop(content: string): ChatChoice {
  return { finishReason: "stop", message: { role: "assistant", content } };
}

function priceRule(item: string): PriceRuleRow {
  return { item, kind: "repair_range", min: 60, max: 90, currency: "USD", conditions: null };
}

describe("askTestZukki sources follow the price tool filter", () => {
  it("records only the rules the tool returned for {item: leak}", async () => {
    const repo = {
      getBusinessProfile: async (): Promise<BusinessProfile | null> => null,
      getPriceRules: async (): Promise<PriceRuleRow[]> => [
        priceRule("Visit"),
        priceRule("Fix a leak"),
        priceRule("Unclog a drain"),
      ],
    };
    const answers = [toolCall("get_price_rules", '{"item":"leak"}'), stop("A leak repair is $60-90.")];

    const result = await askTestZukki({
      tenantId: NORTHSIDE,
      question: "How much to fix a leak?",
      repo,
      chat: async () => answers.shift() ?? stop("done"),
    });

    assert.equal(result.reply, "A leak repair is $60-90.");
    assert.deepEqual(result.sources, ["Fix a leak"]);
  });
});
