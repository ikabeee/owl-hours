import { business } from "../../../shared/data/mock.ts";

// Asking Test Zukki: the demo fake answers from the demo business, the live
// client posts question + history to POST /v1/owner/test-zukki, and the
// session keeps the composer draft, the turns and the error for retry.
export type TestZukkiHistoryItem = { role: "user" | "assistant"; content: string };

export type TestZukkiAnswer = { text: string; sources: string[] };

export type TestZukkiClient = {
  ask(question: string, history: TestZukkiHistoryItem[]): Promise<TestZukkiAnswer>;
};

export type TestZukkiTurn = { question: string; answer: TestZukkiAnswer | null };

export type TestZukkiSnapshot = {
  draft: string;
  turns: TestZukkiTurn[];
  error: string | null;
  status: "ready" | "asking";
};

export type TestZukkiSession = {
  setDraft(draft: string): void;
  ask(): Promise<void>;
  retry(): Promise<void>;
  getSnapshot(): TestZukkiSnapshot;
};

export type TestZukkiLiveDeps = {
  baseUrl: string;
  getToken: () => Promise<string>;
  push: typeof fetch;
};

// The demo fake reproduces the two OwTestZukki design exchanges verbatim;
// anything else falls back to a not-offered answer with no sources.
export function createFakeTestZukkiClient(): TestZukkiClient {
  return {
    ask: async (question) => answerDemo(question),
  };
}

// The live client maps the API reply (reply + sources, S6) to the answer.
export function createLiveTestZukkiClient(deps: TestZukkiLiveDeps): TestZukkiClient {
  return {
    ask: (question, history) => postQuestion(deps, question, history),
  };
}

// One session per screen: every test builds its own, so state never leaks.
export function createTestZukkiSession(client: TestZukkiClient): TestZukkiSession {
  let snapshot: TestZukkiSnapshot = { draft: "", turns: [], error: null, status: "ready" };

  return {
    setDraft: (draft) => {
      snapshot = { ...snapshot, draft };
    },
    ask: () => sendDraft(snapshot.draft),
    retry: () => sendDraft(snapshot.draft),
    getSnapshot: () => snapshot,
  };

  async function sendDraft(question: string): Promise<void> {
    if (question.trim() === "") return;
    snapshot = { ...snapshot, status: "asking" };

    try {
      const answer = await client.ask(question, historyOf(snapshot.turns));
      snapshot = {
        draft: "",
        turns: [...snapshot.turns, { question, answer }],
        error: null,
        status: "ready",
      };
    } catch (error) {
      snapshot = { ...snapshot, error: messageOf(error), status: "ready" };
    }
  }
}

async function postQuestion(
  deps: TestZukkiLiveDeps,
  question: string,
  history: TestZukkiHistoryItem[],
): Promise<TestZukkiAnswer> {
  const token = await deps.getToken();
  const response = await deps.push(`${deps.baseUrl}/v1/owner/test-zukki`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ question, history }),
  });
  if (!response.ok) throw new Error(`Test Zukki answered ${response.status}`);

  const body = (await response.json()) as { success: boolean; data: { reply: string; sources: string[] } };
  return { text: body.data.reply, sources: body.data.sources };
}

function historyOf(turns: TestZukkiTurn[]): TestZukkiHistoryItem[] {
  return turns.flatMap((turn): TestZukkiHistoryItem[] =>
    turn.answer === null
      ? [{ role: "user", content: turn.question }]
      : [
          { role: "user", content: turn.question },
          { role: "assistant", content: turn.answer.text },
        ],
  );
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const KITCHEN_SINK_ANSWER =
  "Northside Plumbing can help tonight. The visit is $45, plus a $25 night fee after 10 PM. " +
  "Unclogging a drain starts at $80. They usually arrive in about 40 minutes.";

const GAS_HEATER_ANSWER = "Gas heaters aren't in Northside's services, so I'd suggest another business for that.";

function answerDemo(question: string): TestZukkiAnswer {
  const asked = question.toLowerCase();
  if (asked.includes("kitchen sink")) {
    return { text: KITCHEN_SINK_ANSWER, sources: ["Visit", "Night fee", "Unclog a drain"] };
  }
  if (asked.includes("gas heater")) return { text: GAS_HEATER_ANSWER, sources: [] };

  return { text: `That's not in ${business.name}'s services, so I'd suggest another business for that.`, sources: [] };
}
