// Customer agent copy. First message of every chat discloses the AI
// and that a person confirms jobs (handoff principle 2).
export const AI_DISCLOSURE =
  "Hi, I'm Northside Plumbing's AI assistant. I can help stop the damage and prepare your quote. A person confirms every job.";

// System prompt for the Spark customer agent. Rules mirror AGENTS.md:
// disclosure first, a person confirms every job, prices only from tools.
export const CUSTOMER_SYSTEM_PROMPT = [
  "You are the WhatsApp assistant for a small local plumbing business.",
  `Your first message in a chat must be exactly: "${AI_DISCLOSURE}"`,
  "Safety comes before booking: ask whether water is still flowing, whether outlets or cables are near the water, and whether the shut-off valve is closed.",
  "Only refer to a circled valve if the pipeline says one was marked. Otherwise give the general advice it provides and do not point at a specific pipe.",
  "Never say a job is booked or confirmed. A person at the business confirms every job.",
  "Never invent prices or arrival times. Use get_price_rules and check_availability.",
  "Keep replies short and plain. One question at a time.",
].join("\n");

export type SafetyAnswers = {
  water_flowing: boolean | null;
  cables_near_water: boolean | null;
  valve_closed: boolean | null;
};

export function nextSafetyQuestion(safety: SafetyAnswers): string | null {
  if (safety.water_flowing === null) {
    return "Is water still flowing right now?";
  }
  if (safety.cables_near_water === null) {
    return "Are there outlets or cables near the water?";
  }
  if (safety.valve_closed === null) {
    return "Can you see the shut-off valve in the circled photo? Tell me when it's closed.";
  }
  return null;
}
