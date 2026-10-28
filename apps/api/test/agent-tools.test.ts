// Agent tools: the conversation comes from our code, never from the model,
// and every write is validated before it reaches the database.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { JobActor, JobState, Ticket } from "@owl-hours/shared";
import { createAgentTools } from "../src/agent/tools.ts";
import { toolSpecs } from "../src/agent/run-agent.ts";
import type { JobRow, ZukkiRepository } from "../src/db/repository.ts";

const ANA = "40000000-0000-4000-8000-000000000001";
const PEDRO = "40000000-0000-4000-8000-000000000002";
const NORTHSIDE = "10000000-0000-4000-8000-000000000001";
const ANA_JOB = "80000000-0000-4000-8000-000000000001";
const PEDRO_JOB = "80000000-0000-4000-8000-000000000002";

const TICKET: Ticket = {
  category: "plumbing",
  title: "Toilet won't stop running",
  urgency: "now",
  safety: { water_flowing: true, cables_near_water: false, valve_closed: true },
  diagnosis: "Fill valve stuck open",
  likely_part: "Fill valve",
  quote: {
    lines: [
      { label: "Visit", min: 45, max: 45 },
      { label: "Night fee", min: 25, max: 25 },
      { label: "Leak repair", min: 60, max: 90 },
    ],
    total_min: 130,
    total_max: 160,
    excludes: "Parts beyond the fill valve",
  },
  arrival_window: "12:55 AM",
};

function fakeRepo(jobs: JobRow[] = []) {
  const calls: string[] = [];
  const transitions: { jobId: string; from: JobState; to: JobState; actor: JobActor; reason: string }[] = [];
  const tickets: { jobId: string; ticket: Ticket }[] = [];
  const repo: ZukkiRepository = {
    searchDirectory: async (input) => {
      calls.push(`search:${input.conversationId}:${input.category}:${(input.exclude ?? []).join("|")}`);
      return [
        {
          tenantId: NORTHSIDE,
          slug: "northside",
          name: "Northside Plumbing",
          rating: 4.9,
          reviewCount: 128,
          nightJobs: true,
          openNow: false,
          distanceKm: 1.2,
        },
      ];
    },
    getBusinessProfile: async (tenantId) =>
      tenantId === NORTHSIDE
        ? {
            id: NORTHSIDE,
            name: "Northside Plumbing",
            category: "plumbing",
            timezone: "America/Cancun",
            website: null,
            rating: 4.9,
            reviewCount: 128,
            acceptsNow: true,
            nightJobs: true,
            hours: [{ weekday: 1, opens: "08:00:00", closes: "18:00:00" }],
          }
        : null,
    getPriceRules: async () => [
      { item: "Visit", kind: "callout", min: 45, max: 45, currency: "USD", conditions: null },
      { item: "Leak repair", kind: "repair_range", min: 60, max: 90, currency: "USD", conditions: null },
    ],
    getJob: async (jobId) => jobs.find((job) => job.id === jobId) ?? null,
    recordJobTransition: async (input) => {
      transitions.push(input);
      const job = jobs.find((candidate) => candidate.id === input.jobId);
      if (!job) throw new Error("job not found");
      return { ...job, state: input.to };
    },
    saveTicket: async (jobId, ticket) => {
      tickets.push({ jobId, ticket });
    },
  };
  return { repo, calls, transitions, tickets };
}

function tool(tools: ReturnType<typeof createAgentTools>, name: string) {
  const found = tools.find((candidate) => candidate.name === name);
  assert.ok(found, `missing tool ${name}`);
  return found;
}

async function call(tools: ReturnType<typeof createAgentTools>, name: string, args: unknown) {
  const selected = tool(tools, name);
  return selected.run(selected.input.parse(args));
}

describe("agent tools", () => {
  it("all have JSON schemas Spark can read", () => {
    const specs = toolSpecs(createAgentTools({ conversationId: ANA, repo: fakeRepo().repo }));
    assert.ok(specs.length >= 5);
    const ticket = specs.find((spec) => spec.function.name === "create_or_update_ticket");
    assert.ok(JSON.stringify(ticket).includes("total_min"), "ticket schema should describe the quote");
  });

  it("searches the directory for this conversation only, without coordinates from the model", async () => {
    const { repo, calls } = fakeRepo();
    const tools = createAgentTools({ conversationId: ANA, repo });
    const result = (await call(tools, "search_directory", { category: "plumbing" })) as { business_id: string }[];

    assert.equal(result[0]?.business_id, NORTHSIDE);
    assert.deepEqual(calls, [`search:${ANA}:plumbing:`]);
    assert.equal(tool(tools, "search_directory").input.safeParse({ category: "plumbing", latitude: 1 }).success, false,
      "coordinates are not an input");
  });

  it("returns a business profile and its prices, filtered by item", async () => {
    const tools = createAgentTools({ conversationId: ANA, repo: fakeRepo().repo });
    const profile = (await call(tools, "get_business_profile", { business_id: NORTHSIDE })) as { name: string };
    assert.equal(profile.name, "Northside Plumbing");

    const prices = (await call(tools, "get_price_rules", { business_id: NORTHSIDE, item: "leak" })) as { item: string }[];
    assert.deepEqual(prices.map((rule) => rule.item), ["Leak repair"]);

    await assert.rejects(call(tools, "get_business_profile", { business_id: "10000000-0000-4000-8000-000000000099" }),
      /business not found/);
  });

  it("moves a job only along the agent's allowed transitions", async () => {
    const { repo, transitions } = fakeRepo([{ id: ANA_JOB, conversationId: ANA, tenantId: NORTHSIDE, state: "requested" }]);
    const tools = createAgentTools({ conversationId: ANA, repo });

    const moved = (await call(tools, "propose_transition", { job_id: ANA_JOB, to_state: "triaged", reason: "safety done" })) as {
      state: string;
    };
    assert.equal(moved.state, "triaged");
    assert.deepEqual(transitions[0], { jobId: ANA_JOB, from: "requested", to: "triaged", actor: "agent", reason: "safety done" });
  });

  it("cannot confirm on the owner's behalf", async () => {
    const { repo, transitions } = fakeRepo([{ id: ANA_JOB, conversationId: ANA, tenantId: NORTHSIDE, state: "proposed" }]);
    const tools = createAgentTools({ conversationId: ANA, repo });
    await assert.rejects(
      call(tools, "propose_transition", { job_id: ANA_JOB, to_state: "owner_confirmed", reason: "looks fine" }),
      /Cannot transition job from proposed to owner_confirmed as agent/,
    );
    assert.equal(transitions.length, 0);
  });

  it("cannot touch a job from another conversation", async () => {
    const { repo, transitions, tickets } = fakeRepo([
      { id: PEDRO_JOB, conversationId: PEDRO, tenantId: NORTHSIDE, state: "requested" },
    ]);
    const tools = createAgentTools({ conversationId: ANA, repo });
    await assert.rejects(call(tools, "propose_transition", { job_id: PEDRO_JOB, to_state: "triaged", reason: "x" }),
      /job not found/);
    await assert.rejects(call(tools, "create_or_update_ticket", { job_id: PEDRO_JOB, ticket: TICKET }), /job not found/);
    assert.equal(transitions.length + tickets.length, 0);
  });

  it("saves a ticket whose quote adds up, until the owner confirms", async () => {
    const { repo, tickets } = fakeRepo([
      { id: ANA_JOB, conversationId: ANA, tenantId: NORTHSIDE, state: "triaged" },
      { id: "80000000-0000-4000-8000-000000000003", conversationId: ANA, tenantId: NORTHSIDE, state: "owner_confirmed" },
    ]);
    const tools = createAgentTools({ conversationId: ANA, repo });

    await call(tools, "create_or_update_ticket", { job_id: ANA_JOB, ticket: TICKET });
    assert.equal(tickets[0]?.ticket.quote.total_max, 160);

    const wrongTotal = { ...TICKET, quote: { ...TICKET.quote, total_max: 999 } };
    assert.equal(tool(tools, "create_or_update_ticket").input.safeParse({ job_id: ANA_JOB, ticket: wrongTotal }).success, false);

    await assert.rejects(
      call(tools, "create_or_update_ticket", { job_id: "80000000-0000-4000-8000-000000000003", ticket: TICKET }),
      /locked/,
    );
  });
});
