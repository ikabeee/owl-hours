// Customer agent copy. First message of every chat discloses the AI
// and that a person confirms jobs (handoff principle 2).
export const AI_DISCLOSURE =
  "Hi, I'm Northside Plumbing's AI assistant. I can help stop the damage and prepare your quote. A person confirms every job.";

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
