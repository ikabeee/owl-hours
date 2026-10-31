// Spec: odd/tasks/owner-notification-test-zukki.md T4 (S6 API). Test Zukki answers
// carry `sources`: the `item` of every price rule the price tool returned while
// answering that question, without duplicates, in first-returned order; empty when
// the answer used no prices. `businessId` and `reply` stay unchanged.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ChatChoice, ChatRequest } from "@owl-hours/meta-models";
import { askTestZukki } from "../src/agent/test-zukki.ts";
import type { BusinessProfile, PriceRuleRow } from "../src/db/repository.ts";
import { testZukki } from "../src/services/owner-service.ts";
import { fakeSupabase } from "./helpers/fake-supabase.ts";

const NORTHSIDE = "10000000-0000-4000-8000-000000000001";
const MARIO = "20000000-0000-4000-8000-000000000001";

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

describe("askTestZukki sources", () => {
  it("returns the price-rule items the price tool returned, deduped in first-returned order", async () => {
    const priceLists = [[priceRule("Visit"), priceRule("Night fee")], [priceRule("Night fee"), priceRule("Unclog a drain")]];
    const repo = {
      getBusinessProfile: async (): Promise<BusinessProfile | null> => null,
      getPriceRules: async () => priceLists.shift() ?? [],
    };
    const answers = [toolCall("get_price_rules", "{}"), toolCall("get_price_rules", "{}"), stop("The visit is $45.")];
    const result = await askTestZukki({
      tenantId: NORTHSIDE,
      question: "How much to unclog a kitchen sink tonight?",
      repo,
      chat: async () => answers.shift() ?? stop("done"),
    });

    assert.equal(result.reply, "The visit is $45.");
    assert.deepEqual(result.sources, ["Visit", "Night fee", "Unclog a drain"]);
  });

  it("returns no sources when the answer used no price rules", async () => {
    const reads: string[] = [];
    const repo = {
      getBusinessProfile: async (): Promise<BusinessProfile | null> => {
        reads.push("profile");
        return null;
      },
      getPriceRules: async (): Promise<PriceRuleRow[]> => {
        reads.push("prices");
        return [];
      },
    };
    const result = await askTestZukki({
      tenantId: NORTHSIDE,
      question: "What are your hours?",
      repo,
      chat: async () => stop("Mon-Sat, 8 AM-8 PM."),
    });

    assert.equal(result.reply, "Mon-Sat, 8 AM-8 PM.");
    assert.deepEqual(result.sources, []);
    assert.deepEqual(reads, [], "no tool ran");
  });
});

describe("owner-service testZukki sources", () => {
  it("keeps businessId and reply, adds sources, and forwards question plus history", async () => {
    const owner = fakeSupabase((call) => {
      if (call.path === "/rest/v1/tenant_users") {
        return { body: [{ tenant_id: NORTHSIDE, role: "owner", display_name: "Daniel" }] };
      }
      if (call.path === "/rest/v1/tenants") {
        return {
          body: [{ id: NORTHSIDE, name: "Northside", short_name: "northside", category: "plumbing", accepts_now: true }],
        };
      }
      return { status: 500, body: {} };
    });
    const service = fakeSupabase(() => ({
      body: [priceRule("Visit")].map((rule) => ({
        item: rule.item,
        kind: rule.kind,
        min_amount: rule.min,
        max_amount: rule.max,
        currency: rule.currency,
        conditions: rule.conditions,
      })),
    }));
    const requests: ChatRequest[] = [];
    const answers = [toolCall("get_price_rules", "{}"), stop("The visit is $45.")];
    const history = [{ role: "user", content: "Do you repair gas heaters?" }] as const;

    const result = await testZukki(
      { userId: MARIO, db: owner.client },
      { question: "How much is a visit?", history: [...history] },
      {
        serviceDb: service.client,
        chat: async (request) => {
          requests.push(structuredClone(request));
          return answers.shift() ?? stop("done");
        },
      },
    );

    assert.equal(result.businessId, NORTHSIDE);
    assert.equal(result.reply, "The visit is $45.");
    assert.deepEqual(result.sources, ["Visit"]);
    const messages = requests[0]?.messages ?? [];
    assert.equal(messages[0]?.role, "system");
    assert.deepEqual(messages.slice(1), [...history, { role: "user", content: "How much is a visit?" }]);
  });
});
