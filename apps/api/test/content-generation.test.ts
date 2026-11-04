import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ChatChoice, ChatRequest } from "@owl-hours/meta-models";
import { generateFacebookPostCopy } from "../src/services/content-generation.ts";

const business = {
  name: "Northside Plumbing",
  category: "plumbing",
  website: "https://northside.example",
  prices: [{ label: "Leak repair", amount: 85 }],
};

function answer(content: string): ChatChoice {
  return { finishReason: "stop", message: { role: "assistant", content } };
}

describe("generateFacebookPostCopy", () => {
  it("uses the owner prompt and that business's context, then validates Muse's title and caption", async () => {
    let request: ChatRequest | undefined;
    const copy = await generateFacebookPostCopy(
      async (input) => {
        request = input;
        return answer(JSON.stringify({
          title: "Help with a leaking tap",
          caption: "Northside Plumbing can help with your leak. Visit https://northside.example.",
        }));
      },
      business,
      "Write a friendly post about leak repairs.",
    );

    assert.deepEqual(copy, {
      title: "Help with a leaking tap",
      caption: "Northside Plumbing can help with your leak. Visit https://northside.example.",
    });
    assert.match(JSON.stringify(request?.messages), /Write a friendly post about leak repairs/);
    assert.match(JSON.stringify(request?.messages), /Northside Plumbing/);
    assert.match(JSON.stringify(request?.messages), /Leak repair/);
    assert.equal(request?.responseFormat?.type, "json_schema");
  });

  it("rejects incomplete or oversized model output instead of saving it as a valid post", async () => {
    await assert.rejects(
      generateFacebookPostCopy(async () => answer('{"title":"Only a title"}'), business, "Write a post."),
      /could not create/i,
    );
    await assert.rejects(
      generateFacebookPostCopy(
        async () => answer(JSON.stringify({ title: "A title", caption: "x".repeat(2201) })),
        business,
        "Write a post.",
      ),
      /could not create/i,
    );
  });

  it("surfaces model failures to the caller", async () => {
    await assert.rejects(
      generateFacebookPostCopy(async () => {
        throw new Error("model offline");
      }, business, "Write a post."),
      /model offline/,
    );
  });
});
