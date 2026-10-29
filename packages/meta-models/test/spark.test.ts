// Muse Spark chat completions: images, tools and structured output.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMetaClient } from "../src/client.ts";
import { createChatCompletion, imagePart, textPart } from "../src/spark.ts";
import { fakeFetch, jsonResponse } from "./fake-fetch.ts";

describe("createChatCompletion", () => {
  it("posts to /chat/completions with the Spark model and returns the first choice", async () => {
    const fetch = fakeFetch(() =>
      jsonResponse({
        choices: [
          {
            finish_reason: "tool_calls",
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                { id: "call_1", type: "function", function: { name: "get_price_rules", arguments: '{"item":"toilet"}' } },
              ],
            },
          },
        ],
      }),
    );
    const client = createMetaClient({ apiKey: "k", fetch: fetch.fn });

    const choice = await createChatCompletion(client, {
      messages: [{ role: "user", content: [textPart("Leak!"), imagePart("data:image/jpeg;base64,AA")] }],
      tools: [
        {
          type: "function",
          function: { name: "get_price_rules", description: "prices", parameters: { type: "object", properties: {} } },
        },
      ],
    });

    assert.equal(choice.finishReason, "tool_calls");
    assert.equal(choice.message.tool_calls?.[0]?.function.name, "get_price_rules");
    const body = fetch.calls[0]?.json as Record<string, unknown>;
    assert.equal(fetch.calls[0]?.url, "https://api.meta.ai/v1/chat/completions");
    assert.equal(body.model, "muse-spark-1.3");
    assert.deepEqual(body.messages, [
      {
        role: "user",
        content: [
          { type: "text", text: "Leak!" },
          { type: "image_url", image_url: { url: "data:image/jpeg;base64,AA" } },
        ],
      },
    ]);
  });

  it("rejects a response with no choices", async () => {
    const fetch = fakeFetch(() => jsonResponse({ choices: [] }));
    const client = createMetaClient({ apiKey: "k", fetch: fetch.fn });
    await assert.rejects(createChatCompletion(client, { messages: [] }), /no choices/);
  });
});
