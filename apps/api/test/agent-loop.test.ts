// Spark agent loop: tool calls are validated by our zod schemas and run by
// our code; the model only proposes.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import type { ChatChoice, ChatRequest } from "@owl-hours/meta-models";
import { runAgent, toolSpecs } from "../src/agent/run-agent.ts";
import type { AgentTool } from "../src/agent/tools.ts";

const priceTool: AgentTool = {
  name: "get_price_rules",
  description: "prices",
  input: z.object({ business_id: z.string(), item: z.string() }),
  run: async (input) => ({ item: (input as { item: string }).item, min: 120, max: 180 }),
};

function toolCall(id: string, name: string, args: string): ChatChoice {
  return {
    finishReason: "tool_calls",
    message: { role: "assistant", content: null, tool_calls: [{ id, type: "function", function: { name, arguments: args } }] },
  };
}

function reply(text: string): ChatChoice {
  return { finishReason: "stop", message: { role: "assistant", content: text } };
}

describe("toolSpecs", () => {
  it("turns zod inputs into JSON schema function tools", () => {
    assert.deepEqual(toolSpecs([priceTool]), [
      {
        type: "function",
        function: {
          name: "get_price_rules",
          description: "prices",
          parameters: {
            type: "object",
            properties: { business_id: { type: "string" }, item: { type: "string" } },
            required: ["business_id", "item"],
            additionalProperties: false,
          },
        },
      },
    ]);
  });
});

describe("runAgent", () => {
  it("runs a tool, returns the result to the model, then returns its reply", async () => {
    const requests: ChatRequest[] = [];
    const answers = [toolCall("c1", "get_price_rules", '{"business_id":"b1","item":"toilet"}'), reply("About $120-180.")];

    const result = await runAgent({
      chat: async (request) => {
        requests.push(structuredClone(request));
        const next = answers.shift();
        if (!next) throw new Error("unexpected call");
        return next;
      },
      tools: [priceTool],
      messages: [{ role: "user", content: "How much for a toilet?" }],
    });

    assert.equal(result.reply, "About $120-180.");
    assert.equal(requests.length, 2);
    const toolMessage = requests[1]?.messages.at(-1);
    assert.deepEqual(toolMessage, {
      role: "tool",
      tool_call_id: "c1",
      content: JSON.stringify({ item: "toilet", min: 120, max: 180 }),
    });
  });

  it("rejects bad tool arguments back to the model instead of running the tool", async () => {
    let ran = false;
    const tool: AgentTool = { ...priceTool, run: async () => ((ran = true), {}) };
    const answers = [toolCall("c1", "get_price_rules", '{"item":5}'), reply("ok")];
    const requests: ChatRequest[] = [];

    await runAgent({
      chat: async (request) => {
        requests.push(structuredClone(request));
        return answers.shift() ?? reply("done");
      },
      tools: [tool],
      messages: [{ role: "user", content: "hi" }],
    });

    assert.equal(ran, false);
    const content = String(requests[1]?.messages.at(-1)?.content);
    assert.match(content, /"error"/);
  });

  it("reports an unknown tool to the model", async () => {
    const answers = [toolCall("c1", "wire_money", "{}"), reply("sorry")];
    const requests: ChatRequest[] = [];
    await runAgent({
      chat: async (request) => {
        requests.push(structuredClone(request));
        return answers.shift() ?? reply("done");
      },
      tools: [priceTool],
      messages: [{ role: "user", content: "hi" }],
    });
    assert.match(String(requests[1]?.messages.at(-1)?.content), /unknown tool: wire_money/);
  });

  it("stops after the turn limit", async () => {
    await assert.rejects(
      runAgent({
        chat: async () => toolCall("c", "get_price_rules", '{"business_id":"b","item":"x"}'),
        tools: [priceTool],
        messages: [{ role: "user", content: "loop" }],
        maxTurns: 3,
      }),
      /3 turns/,
    );
  });
});
