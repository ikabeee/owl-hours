// Muse Spark function tools (handoff section 6). Names and inputs are
// the contract the agent prompts rely on; implementations land per slice.
import { z } from "zod";

export type AgentTool = {
  name: string;
  description: string;
  input: z.ZodTypeAny;
  run: (input: unknown) => Promise<unknown>;
};

function stub(name: string): AgentTool["run"] {
  return async () => {
    throw new Error(`todo: tool ${name}`);
  };
}

export const agentTools: AgentTool[] = [
  {
    name: "get_price_rules",
    description: "Read the business's own price rules for an item.",
    input: z.object({ business_id: z.string(), item: z.string() }),
    run: stub("get_price_rules"),
  },
  {
    name: "check_availability",
    description: "Check arrival windows for a business.",
    input: z.object({ business_id: z.string(), window: z.string() }),
    run: stub("check_availability"),
  },
  {
    name: "check_van_stock",
    description: "Check whether a part is in the technician's van.",
    input: z.object({ technician_id: z.string(), part: z.string() }),
    run: stub("check_van_stock"),
  },
  {
    name: "create_or_update_ticket",
    description: "Write the structured ticket after triage.",
    input: z.object({ job_id: z.string(), ticket: z.record(z.unknown()) }),
    run: stub("create_or_update_ticket"),
  },
  {
    name: "propose_transition",
    description: "Propose a state transition; code validates the actor rules.",
    input: z.object({
      job_id: z.string(),
      to_state: z.string(),
      reason: z.string(),
    }),
    run: stub("propose_transition"),
  },
  {
    name: "send_whatsapp_message",
    description: "Send a text or interactive message to the customer.",
    input: z.object({ job_id: z.string(), body: z.string() }),
    run: stub("send_whatsapp_message"),
  },
  {
    name: "ask_owner",
    description: "Ask the owner a follow-up question with options.",
    input: z.object({ job_id: z.string(), question: z.string() }),
    run: stub("ask_owner"),
  },
];
