// Spark tool loop. The model proposes tool calls; our code validates the
// arguments against each tool's zod schema and runs it. Tool failures go
// back to the model as {"error": ...} so it can recover or hand off.
import type { ChatChoice, ChatMessage, ChatRequest, ToolCall, ToolSpec } from "@owl-hours/meta-models";
import { zodToJsonSchema } from "./json-schema.ts";
import type { AgentTool } from "./tools.ts";

export const DEFAULT_MAX_TURNS = 6;

export type RunAgentInput = {
  chat: (request: ChatRequest) => Promise<ChatChoice>;
  tools: AgentTool[];
  messages: ChatMessage[];
  maxTurns?: number;
};

export type AgentRun = { reply: string; messages: ChatMessage[] };

export function toolSpecs(tools: AgentTool[]): ToolSpec[] {
  return tools.map((tool) => ({
    type: "function",
    function: { name: tool.name, description: tool.description, parameters: zodToJsonSchema(tool.input) },
  }));
}

export async function runAgent(input: RunAgentInput): Promise<AgentRun> {
  const maxTurns = input.maxTurns ?? DEFAULT_MAX_TURNS;
  const specs = toolSpecs(input.tools);
  let history: ChatMessage[] = [...input.messages];

  for (let turn = 0; turn < maxTurns; turn += 1) {
    const choice = await input.chat({ messages: history, tools: specs });
    history = [...history, choice.message];
    const calls = choice.message.tool_calls ?? [];
    if (calls.length === 0) {
      return { reply: choice.message.content ?? "", messages: history };
    }
    // Sequential on purpose: tools like propose_transition have side effects.
    for (const call of calls) {
      history = [...history, await runToolCall(call, input.tools)];
    }
  }
  throw new Error(`agent did not finish within ${maxTurns} turns`);
}

async function runToolCall(call: ToolCall, tools: AgentTool[]): Promise<ChatMessage> {
  const answer = (content: unknown): ChatMessage => ({
    role: "tool",
    tool_call_id: call.id,
    content: JSON.stringify(content ?? null),
  });

  const tool = tools.find((candidate) => candidate.name === call.function.name);
  if (!tool) {
    return answer({ error: `unknown tool: ${call.function.name}` });
  }
  let args: unknown;
  try {
    args = JSON.parse(call.function.arguments || "{}");
  } catch {
    return answer({ error: "arguments are not valid JSON" });
  }
  const parsed = tool.input.safeParse(args);
  if (!parsed.success) {
    return answer({ error: `invalid arguments: ${parsed.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}` });
  }
  try {
    return answer(await tool.run(parsed.data));
  } catch (error) {
    console.error(`[agent] tool ${tool.name} failed`, error);
    return answer({ error: error instanceof Error ? error.message : String(error) });
  }
}
