// Zukki for Business: UI-facing types. Mirrors the data model in docs/02-HANDOFF.md.
// Every server row also carries tenant_id; the app never sends it (RLS resolves it from the session).

export type ID = string;
export type ISODate = string;
export type Money = number;                       // whole currency units, e.g. 45
export type MoneyRange = { min: Money; max: Money };

// ---------- business (tenant) ----------
export type PriceItem = { id: ID; label: string; amount: Money; from: boolean };     // from=true → "from $60"
export type ExtraFee = { id: ID; label: string; amount: Money | "at_cost"; window?: string }; // window: "10 PM–7 AM"
export type Hours = { summary: string; nightUrgent: boolean };                      // "Mon–Sat, 8 AM–8 PM"
export type ServiceArea = { center: { lat: number; lng: number }; radiusKm: number };

export type Business = {
  id: ID;
  name: string;
  category: string;                 // any category from the directory taxonomy, e.g. "plumbing", "restaurant", "salon", "mechanic"
  logoUrl: string;
  website?: string;
  rating: { value: number; count: number };
  technicians: number;
  prices: PriceItem[];
  fees: ExtraFee[];
  hours: Hours;
  area: ServiceArea;
  takingRequests: boolean;
  acceptWindowMin: { urgent: number; other: number };   // { urgent: 5, other: 30 }
};

export type Owner = { id: ID; name: string; phone: string };

// ---------- requests (handoff offers, owner side) ----------
// Platform states are with_zukki → matched → offered → accepted → chatting (docs/03, diagram 5).
// The owner only ever sees an offer, which ends one of three ways:
export type OfferStatus = "offered" | "accepted" | "declined" | "expired";
export type DeclineReason = "busy" | "too_far" | "not_offered" | "other";

export type Media = { kind: "video" | "photo"; url: string; thumbUrl: string; durationS?: number };

// Zukki's diagnosis from the customer's evidence, shown to the owner as a short list.
export type FaultLikelihood = "likely" | "possible";
export type PossibleFault = { label: string; likelihood: FaultLikelihood };

export type RequestOffer = {
  id: ID;
  customerName: string;             // first name + initial only: "Ana L."
  title: string;                    // "Leaking toilet, water reaching the hallway"
  urgent: boolean;
  distanceKm: number;
  approxLocation: string;           // exact address only after the customer approves a quote
  media: Media[];
  customerQuote?: string;           // transcript of the voice note
  zukkiSummary: string;             // "Valve closed, no cables near the water…"
  possibleFaults?: PossibleFault[]; // absent when Zukki could not diagnose from the evidence
  suggestedQuote: MoneyRange;
  offeredAt: ISODate;
  expiresAt: ISODate;               // countdown is computed from this, never stored client-side
  status: OfferStatus;
  declineReason?: DeclineReason;    // set when the owner declines with one of the decline-sheet reasons
};

// ---------- chats ----------
export type Sender = "customer" | "owner" | "zukki";
export type Message = {
  id: ID;
  from: Sender;
  text: string;
  sentAt: ISODate;
  // owner messages only
  delivery?: "as_written" | "polished";   // option A / option B
  ownerDraft?: string;                    // what the owner typed, when delivery = "polished"
};
export type PolishPreview = { original: string; polished: string; language: string }; // shown before sending

export type Conversation = {
  id: ID;
  offerId: ID;
  customerName: string;
  jobTitle: string;
  statusLine: string;               // "visit 12:55 AM", "waiting for you", "quote sent", "done"
  lastMessage: Message;
  unread: number;
};

// ---------- jobs ----------
export type JobStatus = "quoted" | "owner_confirmed" | "customer_approved" | "en_route" | "on_site" | "done";
export type QuoteLine = { label: string; amount: Money | MoneyRange };
export type Quote = { lines: QuoteLine[]; total: MoneyRange; arrival: { from: string; to: string }; technician: string; note?: string };
export type TimelineEvent = { at: ISODate; text: string };

export type Job = {
  id: ID;
  conversationId: ID;
  title: string;
  customerName: string;
  technician: string;
  address?: string;                 // present from customer_approved on
  distanceKm?: number;              // from the business to the customer, shown with the address
  approvedAt?: ISODate;             // when the customer approved the quote
  quote: Quote;
  finalTotal?: Money;
  status: JobStatus;
  timeline: TimelineEvent[];
  photos: { before?: string; after?: string; extra: string[] };
  shareConsent: "not_asked" | "asked" | "yes" | "no";
};

// ---------- content ----------
export type PostStatus = "draft" | "scheduled" | "published" | "rejected";
export type PostDraft = {
  id: ID;
  title: string;                    // internal label: "Fixed in 91 minutes"
  caption: string;
  imageUrl?: string;
  source: "job" | "prices" | "reminder";
  sourceJobId?: ID;                 // job photos are used only when shareConsent = "yes"
  targets: { facebook: boolean; instagram: boolean };
  scheduledFor?: ISODate;
  status: PostStatus;
  publishedAt?: ISODate;
};

export type LinkedAccount = {
  kind: "facebook_page" | "instagram";            // Instagram must be a professional account
  name: string;
  status: "connected" | "not_connected";
};
