// Notices Zukki owes the customer after something changes on the owner's
// side: accepted (10), expired or declined (09 + 07) and a sent quote (13).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { quote } from "../src/orchestrator/copy.ts";
import { planNotices, runNotices } from "../src/orchestrator/notices.ts";
import type { ConversationStore } from "../src/orchestrator/types.ts";
import { fakeSupabase } from "./helpers/fake-supabase.ts";

const CHAT = "40000000-0000-4000-8000-000000000001";
const OTHER_CHAT = "40000000-0000-4000-8000-000000000002";
const NORTHSIDE = "10000000-0000-4000-8000-000000000001";
const HANDOFF = "50000000-0000-4000-8000-000000000001";
const QUOTE = "90000000-0000-4000-8000-000000000001";

const handoff = (status: string, over: Record<string, unknown> = {}) => ({
  id: HANDOFF,
  conversation_id: CHAT,
  tenant_id: NORTHSIDE,
  status,
  ...over,
});

const quoteRow = {
  id: QUOTE,
  conversationId: CHAT,
  tenant_id: NORTHSIDE,
  lines: [{ label: "Visit", min: 45, max: 45 }],
  total_min: 45,
  total_max: 45,
  currency: "USD",
  technician_id: null,
  arrivalWindow: "12:55–1:25 AM",
};

describe("planNotices", () => {
  it("tells the customer once that the business accepted", () => {
    const plan = planNotices({
      handoffs: [handoff("accepted")],
      quotes: [],
      conversations: [{ id: CHAT, state: "accepted", category: "plumbing" }],
      sent: new Set(),
    });
    assert.deepEqual(plan, [{ kind: "accepted", conversationId: CHAT, tenantId: NORTHSIDE, notice: `handoff:${HANDOFF}:accepted` }]);

    const again = planNotices({
      handoffs: [handoff("accepted")],
      quotes: [],
      conversations: [{ id: CHAT, state: "accepted", category: "plumbing" }],
      sent: new Set([`handoff:${HANDOFF}:accepted`]),
    });
    assert.deepEqual(again, []);
  });

  it("offers the next business after an expiry or decline, unless a new offer is already out", () => {
    const plan = planNotices({
      handoffs: [handoff("expired"), handoff("declined", { id: "50000000-0000-4000-8000-000000000002", conversation_id: OTHER_CHAT })],
      quotes: [],
      conversations: [
        { id: CHAT, state: "matched", category: "plumbing" },
        { id: OTHER_CHAT, state: "offered", category: "plumbing" },
      ],
      sent: new Set(),
    });
    assert.deepEqual(plan, [
      { kind: "next", conversationId: CHAT, tenantId: NORTHSIDE, reason: "expired", category: "plumbing", notice: `handoff:${HANDOFF}:expired` },
    ]);
  });

  it("sends a new quote once", () => {
    const plan = planNotices({ handoffs: [], quotes: [quoteRow], conversations: [], sent: new Set() });
    assert.deepEqual(plan, [{ kind: "quote", conversationId: CHAT, quote: quoteRow, notice: `quote:${QUOTE}` }]);
    assert.deepEqual(planNotices({ handoffs: [], quotes: [quoteRow], conversations: [], sent: new Set([`quote:${QUOTE}`]) }), []);
  });
});

describe("runNotices", () => {
  it("only looks at the last two hours, never at future-dated seed rows", async () => {
    const { client, calls } = fakeSupabase(() => ({ body: [] }));
    const done = await runNotices(
      { db: client, store: {} as ConversationStore, directory: { matches: async () => [], connect: async () => ({ expiresAt: "" }) }, log: { info() {}, warn() {}, error() {} } },
      new Date("2026-10-28T12:00:00.000Z"),
    );
    assert.equal(done, 0);
    const handoffs = calls.find((c) => c.path === "/rest/v1/handoffs");
    assert.deepEqual(handoffs?.query.getAll("resolved_at"), ["gte.2026-10-28T10:00:00.000Z", "lte.2026-10-28T12:00:00.000Z"]);
    const quotes = calls.find((c) => c.path === "/rest/v1/quotes");
    assert.deepEqual(quotes?.query.getAll("sent_at"), ["gte.2026-10-28T10:00:00.000Z", "lte.2026-10-28T12:00:00.000Z"]);
  });
});

describe("runNotices: one pass", () => {
  const EXPIRED = "50000000-0000-4000-8000-000000000003";
  const EASTSIDE = "10000000-0000-4000-8000-000000000002";
  const JOB = "80000000-0000-4000-8000-000000000001";
  const MARIO = "30000000-0000-4000-8000-000000000001";

  it("queues accepted, next business and quote notices, each once", async () => {
    const { client } = fakeSupabase((call) => {
      switch (call.path) {
        case "/rest/v1/handoffs":
          return {
            body: [
              { id: HANDOFF, conversation_id: CHAT, tenant_id: NORTHSIDE, status: "accepted" },
              { id: EXPIRED, conversation_id: OTHER_CHAT, tenant_id: NORTHSIDE, status: "expired" },
            ],
          };
        case "/rest/v1/quotes":
          return {
            body: [{ id: QUOTE, job_id: JOB, tenant_id: NORTHSIDE, lines: [{ label: "Visit", min: 45, max: 45 }], total_min: 45, total_max: 45, currency: "USD", technician_id: MARIO }],
          };
        case "/rest/v1/jobs":
          return { body: [{ id: JOB, conversation_id: CHAT, arrival_window: "12:55–1:25 AM" }] };
        case "/rest/v1/conversations":
          return { body: [{ id: CHAT, state: "accepted", category: "plumbing" }, { id: OTHER_CHAT, state: "matched", category: "plumbing" }] };
        case "/rest/v1/messages":
          return { body: [{ payload: { notice: "some:other:notice" } }] };
        case "/rest/v1/technicians":
          return { body: { display_name: "Mario R." } };
        default:
          return { body: [] };
      }
    });
    const queued: Array<{ conversationId: string; body: string; tenantId: string | null; notice: unknown }> = [];
    const store = {
      businessName: async () => "Northside Plumbing",
      queue: async (conversationId: string, message: { body: string; payload?: Record<string, unknown> }, tenantId?: string | null) => {
        queued.push({ conversationId, body: message.body, tenantId: tenantId ?? null, notice: message.payload?.notice });
      },
    } as unknown as ConversationStore;
    const eastside = {
      businessId: EASTSIDE, name: "Eastside Plumbing", shortName: "Eastside", rating: 4.8, reviews: 96, distanceKm: 2.4, etaMinutes: 55,
      openNow: true, takesNightJobs: true, currency: "USD", visit: 45, nightFee: { amount: 30, window: "10 PM-7 AM" }, repairFrom: 60, repairLabel: "Leak repair",
    };
    const done = await runNotices(
      { db: client, store, directory: { matches: async () => [eastside], connect: async () => ({ expiresAt: "" }) }, log: { info() {}, warn() {}, error() {} } },
      new Date("2026-10-28T12:00:00.000Z"),
    );
    assert.equal(done, 3);
    assert.deepEqual(queued.map((q) => [q.conversationId, q.notice ?? null, q.tenantId]), [
      [CHAT, `handoff:${HANDOFF}:accepted`, NORTHSIDE],
      [OTHER_CHAT, `handoff:${EXPIRED}:expired`, null],
      [OTHER_CHAT, null, null],
      [CHAT, `quote:${QUOTE}`, NORTHSIDE],
    ]);
    assert.match(queued[0]!.body, /^Northside Plumbing accepted\./);
    assert.match(queued[1]!.body, /didn't answer in time/);
    assert.match(queued[2]!.body, /^★ 4\.8 \(96\)/);
    assert.match(queued[3]!.body, /^Mario R\. · arrives 12:55–1:25 AM/);
  });

  it("says nobody else is open when there is no next business", async () => {
    const { client } = fakeSupabase((call) => {
      if (call.path === "/rest/v1/handoffs") return { body: [{ id: HANDOFF, conversation_id: CHAT, tenant_id: NORTHSIDE, status: "declined" }] };
      if (call.path === "/rest/v1/conversations") return { body: [{ id: CHAT, state: "matched", category: "plumbing" }] };
      return { body: [] };
    });
    const bodies: string[] = [];
    const store = { businessName: async () => "Northside Plumbing", queue: async (_c: string, m: { body: string }) => void bodies.push(m.body) } as unknown as ConversationStore;
    await runNotices({ db: client, store, directory: { matches: async () => [], connect: async () => ({ expiresAt: "" }) }, log: { info() {}, warn() {}, error() {} } });
    assert.deepEqual(bodies, ["Northside Plumbing can't take this one, and no other plumber is open near you right now. Message me anytime and I'll look again."]);
  });
});

describe("quote copy (13)", () => {
  it("matches the demo quote", () => {
    const message = quote(
      {
        quoteId: QUOTE,
        businessName: "Northside Plumbing",
        technician: "Mario R.",
        arrivalWindow: "12:55–1:25 AM",
        lines: [
          { label: "Visit", min: 45, max: 45 },
          { label: "Night fee", min: 25, max: 25 },
          { label: "Fill valve repair", min: 60, max: 90 },
        ],
        totalMin: 130,
        totalMax: 160,
        currency: "USD",
      },
      `quote:${QUOTE}`,
    );
    assert.equal(
      message.body,
      "Mario R. · arrives 12:55–1:25 AM\n\nVisit: $45\nNight fee: $25\nFill valve repair: $60–90\n*Estimated total: $130–160*\n\nYou pay Mario after the repair.",
    );
    assert.equal(message.payload?.header_text, "Quote from Northside Plumbing");
    assert.equal(message.payload?.footer, "Nothing is booked until you approve");
    assert.deepEqual(
      (message.payload?.buttons as Array<{ id: string }>).map((b) => b.id),
      [`quote_approve:${QUOTE}`, `quote_question:${QUOTE}`],
    );
  });
});
