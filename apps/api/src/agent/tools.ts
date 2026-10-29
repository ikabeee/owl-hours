// Muse Spark function tools (handoff section 6). The conversation is bound
// by our code when the tools are created, never taken from the model, and
// every write is checked against the shared job state machine before it
// reaches the database.
import { z } from "zod";
import { CATEGORIES, JOB_STATES, ticketSchema, transitionJob } from "@owl-hours/shared";
import type { JobRow, ZukkiRepository } from "../db/repository.ts";

export type AgentTool = {
  name: string;
  description: string;
  input: z.ZodTypeAny;
  run: (input: unknown) => Promise<unknown>;
};

export type ToolContext = {
  conversationId: string;
  repo: ZukkiRepository;
};

// The ticket (and its quote) can change until the owner confirms it.
const TICKET_EDITABLE_STATES = new Set(["requested", "triaged", "proposed"]);

const businessId = z.string().uuid().describe("business_id returned by search_directory");
const jobId = z.string().uuid();

export function defineTool<S extends z.ZodTypeAny>(tool: {
  name: string;
  description: string;
  input: S;
  run: (input: z.infer<S>) => Promise<unknown>;
}): AgentTool {
  return { ...tool, run: (input) => tool.run(input as z.infer<S>) };
}

function stub(name: string, description: string, input: z.ZodTypeAny): AgentTool {
  return {
    name,
    description,
    input,
    run: async () => {
      throw new Error(`todo: tool ${name}`);
    },
  };
}

export function createAgentTools(ctx: ToolContext): AgentTool[] {
  // Same answer for "missing" and "another conversation's job": no leak.
  async function ownJob(id: string): Promise<JobRow> {
    const job = await ctx.repo.getJob(id);
    if (!job || job.conversationId !== ctx.conversationId) {
      throw new Error("job not found");
    }
    return job;
  }

  return [
    defineTool({
      name: "search_directory",
      description:
        "Find up to 3 businesses in a category that can take this request now, closest first. " +
        "Uses the location the customer shared; if they have not shared one, ask them to. " +
        "Businesses already suggested or offered in this chat are skipped automatically.",
      input: z
        .object({
          category: z.enum(CATEGORIES),
          exclude_business_ids: z.array(z.string().uuid()).max(20).optional()
            .describe("businesses already offered, for 'Show another option'"),
        })
        .strict(),
      run: async ({ category, exclude_business_ids }) => {
        const matches = await ctx.repo.searchDirectory({
          conversationId: ctx.conversationId,
          category,
          exclude: exclude_business_ids ?? [],
        });
        return matches.map((match) => ({
          business_id: match.tenantId,
          name: match.name,
          rating: match.rating,
          reviews: match.reviewCount,
          distance_km: match.distanceKm,
          open_now: match.openNow,
          takes_night_jobs: match.nightJobs,
          can_arrive_in_min: match.etaMinutes,
        }));
      },
    }),
    defineTool({
      name: "get_business_profile",
      description: "Read a business's public profile and opening hours.",
      input: z.object({ business_id: businessId }).strict(),
      run: async ({ business_id }) => {
        const profile = await ctx.repo.getBusinessProfile(business_id);
        if (!profile) {
          throw new Error("business not found");
        }
        return profile;
      },
    }),
    defineTool({
      name: "get_price_rules",
      description: "Read the business's own price rules. Never quote a price that is not here.",
      input: z
        .object({
          business_id: businessId,
          item: z.string().min(1).max(80).optional().describe("filter, e.g. leak"),
        })
        .strict(),
      run: async ({ business_id, item }) => {
        const rules = await ctx.repo.getPriceRules(business_id);
        const needle = item?.toLowerCase();
        return needle ? rules.filter((rule) => rule.item.toLowerCase().includes(needle)) : rules;
      },
    }),
    defineTool({
      name: "create_or_update_ticket",
      description:
        "Write the structured ticket and quote for this conversation's job. " +
        "Quote totals must equal the sum of the lines. Locked once the owner confirms.",
      input: z.object({ job_id: jobId, ticket: ticketSchema }).strict(),
      run: async ({ job_id, ticket }) => {
        const job = await ownJob(job_id);
        if (!TICKET_EDITABLE_STATES.has(job.state)) {
          throw new Error(`the ticket is locked once the job is ${job.state}`);
        }
        await ctx.repo.saveTicket(job.id, ticket);
        return { job_id: job.id, saved: true };
      },
    }),
    defineTool({
      name: "propose_transition",
      description:
        "Move this conversation's job to the next state. Only agent moves are allowed; " +
        "the owner and the customer confirm in their own apps.",
      input: z
        .object({
          job_id: jobId,
          to_state: z.enum(JOB_STATES),
          reason: z.string().min(1).max(500),
        })
        .strict(),
      run: async ({ job_id, to_state, reason }) => {
        const job = await ownJob(job_id);
        const to = transitionJob(job.state, to_state, "agent");
        const moved = await ctx.repo.recordJobTransition({ jobId: job.id, from: job.state, to, actor: "agent", reason });
        return { job_id: moved.id, state: moved.state };
      },
    }),
    stub(
      "check_van_stock",
      "Check whether a part is in the technician's van.",
      z.object({ technician_id: z.string(), part: z.string() }),
    ),
    stub(
      "send_whatsapp_message",
      "Send a text or interactive message to the customer.",
      z.object({ body: z.string().min(1).max(4096) }),
    ),
    stub("ask_owner", "Ask the owner a follow-up question with options.", z.object({ question: z.string() })),
  ];
}
