// The chat so far, as Spark messages (for answers) or as a transcript (for
// reading the need). Owner messages are not Zukki's words, so the agent
// does not see them as its own.
import type { ChatMessage } from "@owl-hours/meta-models";
import type { HistoryEntry } from "./types.ts";

const SPEAKER: Record<HistoryEntry["from"], string> = { customer: "Customer", zukki: "Zukki", owner: "Business" };

export function historyMessages(history: HistoryEntry[]): ChatMessage[] {
  return history.flatMap((entry): ChatMessage[] => {
    if (entry.from === "customer") return [{ role: "user", content: entry.text }];
    if (entry.from === "zukki") return [{ role: "assistant", content: entry.text }];
    return [];
  });
}

export function historyText(history: HistoryEntry[]): string {
  return history.map((entry) => `${SPEAKER[entry.from]}: ${entry.text}`).join("\n");
}
