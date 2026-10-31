// Intro pager content. Source: handoff-ui/owner-app/design/html/Ow{Welcome,Intro2,Intro3}.dc.html.
// Slide 3 carries its own actions; slides 1-2 advance with "Next" and offer "Skip" (copys.introSkip).
// Labels come from copys so the pager aria text and the buttons stay byte-identical to the handoff.
import { onboardingCopys } from "../copys/onboardingCopys.ts";
export type IntroSlide = {
  title: string;
  lead: string;
  showSkip: boolean;
  primaryAction: string;
  secondaryAction?: string;
};

export const introSlides: IntroSlide[] = [
  {
    title: "Hi, I'm Zukki",
    lead: "People message me on WhatsApp when they need a local business. I find them one nearby that is open, like yours.",
    showSkip: true,
    primaryAction: onboardingCopys.nextAction,
  },
  {
    title: "I bring you nearby requests",
    lead: "Day or night, I send you jobs in your area with the customer's photos or video. Urgent ones wait 5 minutes for you, the rest 30.",
    showSkip: true,
    primaryAction: onboardingCopys.nextAction,
  },
  {
    title: "You have the final word",
    lead: "I suggest replies, quotes and posts. Nothing reaches a customer or your Page until you approve it.",
    showSkip: false,
    primaryAction: onboardingCopys.createAccount,
    secondaryAction: onboardingCopys.hasAccount,
  },
];

// Pager dots aria text ("Slide 1 of 3"), built from copys like stepLabel; page is 1-based.
export function pagerLabel(page: number, total: number): string {
  return `${onboardingCopys.slideWord} ${page} ${onboardingCopys.stepOf} ${total}`;
}
