// Live-screen sentences, composed from copys so the business name, category and radius stay
// dynamic. For the demo business they render exactly the handoff copy (see liveText.test.ts):
// "Northside is live on Zukki" and "Zukki can now suggest you for plumbing requests within 5 km."
import { onboardingCopys } from "../copys/onboardingCopys.ts";

export function liveTitleFor(businessName: string): string {
  return `${shortBusinessName(businessName)} ${onboardingCopys.liveTitleTail}`;
}

export function liveSubtitleFor(category: string, radiusKm: number): string {
  return (
    `${onboardingCopys.liveLead} ${category.toLowerCase()} ` +
    `${onboardingCopys.liveWithin} ${radiusKm} ${onboardingCopys.kmUnit}.`
  );
}

function shortBusinessName(businessName: string): string {
  return businessName.trim().split(/\s+/)[0] ?? "";
}
