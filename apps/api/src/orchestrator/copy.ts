// Zukki's wording, from handoff-ui/whatsapp/payloads (01-15). Written by
// our code, not the model, so the disclosure, safety steps and prices can
// never be reworded or invented.
import type { Category } from "@owl-hours/shared";
import { AI_DISCLOSURE, OFF_TOPIC_REPLY } from "../agent/customer-agent.ts";
import type { Match, ReplyButton, ZukkiMessage } from "./types.ts";

// WhatsApp limits: button title 20, header and footer 60, button body 1024.
const HEADER_MAX = 60;
const FOOTER_MAX = 60;
const BUTTON_BODY_MAX = 1024;

const NOUNS: Record<Category, string> = {
  plumbing: "plumber",
  electrical: "electrician",
  locksmith: "locksmith",
  food: "place",
  beauty: "salon",
  auto: "mechanic",
  pets: "pet business",
};

export const nounFor = (category: Category): string => NOUNS[category];

// "a plumber who is open", "a place that is open".
function someone(category: Category, options: { another?: boolean } = {}): string {
  const noun = nounFor(category);
  const who = category === "food" || category === "pets" ? "that" : "who";
  return `${options.another ? `another ${noun}` : article(noun)} ${who} is open near you`;
}

const text = (body: string, payload?: Record<string, unknown>): ZukkiMessage =>
  payload ? { kind: "text", body, payload } : { kind: "text", body };

const clip = (value: string, max: number): string => (value.length <= max ? value : `${value.slice(0, max - 1)}…`);

export function money(amount: number, currency: string): string {
  return currency === "USD" ? `$${amount}` : `${amount} ${currency}`;
}

export function moneyRange(min: number, max: number, currency: string): string {
  if (min === max) return money(min, currency);
  return currency === "USD" ? `$${min}–${max}` : `${min}–${max} ${currency}`;
}

// 01
export const disclosure = (): ZukkiMessage => text(AI_DISCLOSURE);

// 14
export const offTopic = (): ZukkiMessage => text(OFF_TOPIC_REPLY);

// 02: the sections and rows live in outbox.ts (CATEGORY_LIST).
export const categoryList = (): ZukkiMessage => ({
  kind: "interactive",
  body: "What are you looking for? You can also send a photo, a video or a voice note.",
  payload: { variant: "category_list" },
});

export const SAFETY_BUTTONS: ReplyButton[] = [
  { id: "safety_done", title: "Done, no cables" },
  { id: "safety_cant_find", title: "I can't find it" },
];

// 04. With a marked frame the image shows the valve; without one, general
// advice and no picture (handoff rule 10: never point at a pipe we did not find).
export function waterSafety(input: { markedFrameUrl: string | null; advice: string | null }): ZukkiMessage {
  const body = input.markedFrameUrl
    ? "Let's stop the water first: turn this valve clockwise. Any outlets or cables near the water?"
    : `Let's stop the water first. ${
        input.advice ??
        "Find the shut-off valve on the pipe under or behind the fixture and turn it clockwise until it stops."
      } Any outlets or cables near the water?`;
  return {
    kind: "interactive",
    body: clip(body, BUTTON_BODY_MAX),
    payload: {
      variant: "safety",
      buttons: SAFETY_BUTTONS,
      ...(input.markedFrameUrl ? { header_image_url: input.markedFrameUrl } : {}),
    },
  };
}

export const cantFindValve = (): ZukkiMessage =>
  text(
    "No problem. Look for the main shut-off where the water line enters your home, often near the water meter, an outside wall or under the kitchen sink. Turn it clockwise until it stops. Stay away from outlets and cables near the water.",
  );

export const electricalSafety = (): ZukkiMessage =>
  text(
    "Stay safe first: don't touch outlets, switches or cables near water, and switch off the main breaker only if you can reach it safely. If you see sparks or smell burning, leave and call emergency services.",
    { variant: "safety_text" },
  );

// 05
export function locationRequest(category: Category, options: { waterOff: boolean }): ZukkiMessage {
  const ask = `share your location so I can find ${someone(category)}.`;
  const lead = options.waterOff ? `Good, the water is off. Now ${ask}` : capitalize(ask);
  return { kind: "location_request", body: `${lead} The business only sees the exact address after you approve a visit.` };
}

export const describeNeed = (category: Category): ZukkiMessage =>
  text(`Got it, I'll find you ${article(nounFor(category))}. What's going on? You can also send a photo, a video or a voice note.`);

export const askWhatTheyNeed = (): ZukkiMessage =>
  text("Tell me what you need, or send a photo, a video or a voice note.");

// 06
export const finding = (category: Category): ZukkiMessage => text(`Thanks. I'm finding ${someone(category)}.`);

export const noneNearby = (category: Category, options: { another?: boolean } = {}): ZukkiMessage =>
  text(`I couldn't find ${someone(category, options)} right now. Message me anytime and I'll look again.`);

export const SUGGEST_BUTTONS = (businessId: string): ReplyButton[] => [
  { id: `connect:${businessId}`, title: "Connect me" },
  { id: "another_option", title: "Show another option" },
];

// 07. Only lines the business actually has; prices come from its own rules.
export function suggestion(match: Match, category: Category, options: { afterTimeout?: boolean } = {}): ZukkiMessage {
  const facts = [
    match.rating === null ? null : `★ ${match.rating.toFixed(1)}${match.reviews === null ? "" : ` (${match.reviews})`}`,
    match.distanceKm === null ? null : `${match.distanceKm.toFixed(1)} km`,
    match.openNow ? "open now" : null,
  ].filter(Boolean);
  const prices = [
    match.visit === null ? null : `Visit: ${money(match.visit, match.currency)}`,
    match.nightFee === null
      ? null
      : `Night fee${match.nightFee.window ? ` (${match.nightFee.window.replace(/\s*-\s*/, "–")})` : ""}: +${money(match.nightFee.amount, match.currency)}`,
    match.repairFrom === null ? null : `${match.repairLabel ?? "Repair"}: from ${money(match.repairFrom, match.currency)}`,
    match.etaMinutes === null ? null : `Can arrive: in about ${match.etaMinutes} min`,
  ].filter(Boolean);
  const body = [facts.join(" · "), prices.join("\n")].filter(Boolean).join("\n\n") || match.name;
  const footer = options.afterTimeout
    ? "Your video and details go with the request"
    : `Closest ${nounFor(category)} ${match.takesNightJobs ? "taking night jobs" : "open"} right now`;
  return {
    kind: "interactive",
    body: clip(body, BUTTON_BODY_MAX),
    payload: {
      variant: "suggest_business",
      business_id: match.businessId,
      header_text: clip(match.name, HEADER_MAX),
      footer: clip(footer, FOOTER_MAX),
      buttons: SUGGEST_BUTTONS(match.businessId),
    },
  };
}

// 08
export const requestSent = (businessName: string, minutes: number): ZukkiMessage =>
  text(`I sent your request to ${businessName}. They have up to ${minutes} minutes to accept.`);

export const alreadyOffered = (): ZukkiMessage =>
  text("Your request is already with a business. I'll tell you as soon as they answer.");

export const connectFailed = (): ZukkiMessage =>
  text("Sorry, I couldn't send your request just now. Tap Connect me again in a moment.");

// 09 (followed by 07 for the next business)
export function nextBusiness(businessName: string, reason: "expired" | "declined", notice: string): ZukkiMessage {
  const why = reason === "expired" ? "didn't answer in time" : "can't take this one";
  return text(`${businessName} ${why}, so I won't keep you waiting. This business is free now:`, { notice });
}

export function noNextBusiness(businessName: string, reason: "expired" | "declined", category: Category | null, notice: string): ZukkiMessage {
  const why = reason === "expired" ? "didn't answer in time" : "can't take this one";
  const who = category ? `other ${nounFor(category)}` : "other business";
  return text(`${businessName} ${why}, and no ${who} is open near you right now. Message me anytime and I'll look again.`, { notice });
}

// 10
export const accepted = (businessName: string, notice: string): ZukkiMessage =>
  text(`${businessName} accepted. You're now talking with their team. Type *Zukki* anytime to talk to me.`, { notice });

// 15
export const zukkiIsBack = (businessName: string): ZukkiMessage =>
  text(`I'm here. Your chat with ${businessName} stays open. What do you need?`);

export const mediaFailed = (): ZukkiMessage =>
  text("Sorry, I couldn't open that file. Could you send it again?");

export const somethingWentWrong = (): ZukkiMessage =>
  text("Sorry, something went wrong on my side. Please try again in a moment.");

// 13
export type QuoteCopy = {
  quoteId: string;
  businessName: string;
  technician: string | null;
  arrivalWindow: string | null;
  lines: Array<{ label: string; min: number; max: number }>;
  totalMin: number;
  totalMax: number;
  currency: string;
};

export function quote(input: QuoteCopy, notice: string): ZukkiMessage {
  const who = input.technician ?? input.businessName;
  const lead = input.arrivalWindow ? `${who} · arrives ${input.arrivalWindow}` : who;
  const lines = input.lines.map((line) => `${line.label}: ${moneyRange(line.min, line.max, input.currency)}`);
  const payTo = input.technician ? input.technician.split(/\s+/)[0] : input.businessName;
  const body = [
    lead,
    [...lines, `*Estimated total: ${moneyRange(input.totalMin, input.totalMax, input.currency)}*`].join("\n"),
    `You pay ${payTo} after the repair.`,
  ].join("\n\n");
  return {
    kind: "interactive",
    body: clip(body, BUTTON_BODY_MAX),
    payload: {
      variant: "quote",
      notice,
      quote_id: input.quoteId,
      header_text: clip(`Quote from ${input.businessName}`, HEADER_MAX),
      footer: "Nothing is booked until you approve",
      buttons: [
        { id: `quote_approve:${input.quoteId}`, title: "Approve visit" },
        { id: `quote_question:${input.quoteId}`, title: "Ask a question" },
      ],
    },
  };
}

function article(noun: string): string {
  return /^[aeiou]/i.test(noun) ? `an ${noun}` : `a ${noun}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
