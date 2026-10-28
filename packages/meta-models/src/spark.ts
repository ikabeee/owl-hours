// Muse Spark over the OpenAI-compatible Chat Completions endpoint:
// image input, function tools and json_schema structured output.
import { z } from "zod";
import type { MetaClient } from "./client.ts";

export const SPARK_MODEL = "muse-spark-1.3";

export type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type AssistantMessage = {
  role: "assistant";
  content: string | null;
  tool_calls?: ToolCall[];
};

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string | ContentPart[] }
  | AssistantMessage
  | { role: "tool"; tool_call_id: string; content: string };

export type ToolSpec = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export type ResponseFormat = {
  type: "json_schema";
  json_schema: { name: string; schema: Record<string, unknown> };
};

export type ChatRequest = {
  messages: ChatMessage[];
  tools?: ToolSpec[];
  responseFormat?: ResponseFormat;
  temperature?: number;
  model?: string;
};

export type ChatChoice = { finishReason: string; message: AssistantMessage };

export function textPart(text: string): ContentPart {
  return { type: "text", text };
}

export function imagePart(url: string): ContentPart {
  return { type: "image_url", image_url: { url } };
}

const choiceSchema = z.object({
  finish_reason: z.string().nullable(),
  message: z.object({
    role: z.literal("assistant"),
    content: z.string().nullable().default(null),
    tool_calls: z
      .array(
        z.object({
          id: z.string(),
          type: z.literal("function"),
          function: z.object({ name: z.string(), arguments: z.string() }),
        }),
      )
      .optional(),
  }),
});

const completionSchema = z.object({ choices: z.array(choiceSchema) });

export async function createChatCompletion(client: MetaClient, request: ChatRequest): Promise<ChatChoice> {
  const body = {
    model: request.model ?? SPARK_MODEL,
    messages: request.messages,
    ...(request.tools && request.tools.length > 0 ? { tools: request.tools } : {}),
    ...(request.responseFormat ? { response_format: request.responseFormat } : {}),
    ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
  };
  const parsed = completionSchema.parse(await client.postJson("/chat/completions", body));
  const first = parsed.choices[0];
  if (!first) {
    throw new Error("Spark returned no choices");
  }
  const toolCalls = first.message.tool_calls;
  return {
    finishReason: first.finish_reason ?? "stop",
    message: {
      role: "assistant",
      content: first.message.content,
      ...(toolCalls && toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
    },
  };
}
