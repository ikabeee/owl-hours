import type { OwnerApi } from "../../../lib/ownerApi.ts";
import type { Conversation, ID, Message, MoneyRange, Sender } from "../../../shared/data/types.ts";
import { buildAsWrittenMessage, buildChosenMessage } from "../lib/ownerDelivery.ts";
import type { ConversationsService, QuoteSuggestion } from "./conversationsService.ts";

// One chat row from GET /v1/owner/conversations (public.owner_conversations).
export type ApiConversation = {
  id: ID;
  offerId: ID;
  title: string | null;
  customerName: string | null;
  chatOpen: boolean;
  job: { id: ID; state: string; arrivalWindow: string | null } | null;
  lastMessage: { id: ID; from: string; kind: string; text: string | null; sentAt: string } | null;
  unread: number;
};

// One message from GET /v1/owner/conversations/:id/messages.
export type ApiMessage = {
  id: ID;
  from: string;
  kind: string;
  text: string | null;
  sentAt: string;
  delivery?: "as_written" | "polished" | null;
  media: { kind: string; transcript?: string | null } | null;
};

type Sent = { id: ID; sentAt: string };

const STATUS_LINES: Record<string, string> = {
  proposed: "waiting for you",
  owner_confirmed: "quote sent",
  en_route: "on the way",
  on_site: "on site",
  done: "done",
};

export function toConversation(api: ApiConversation): Conversation {
  const last = api.lastMessage;
  return {
    id: api.id,
    offerId: api.offerId,
    customerName: api.customerName ?? "Customer",
    jobTitle: api.title ?? "Request",
    statusLine: statusLineOf(api),
    unread: api.unread,
    lastMessage: last
      ? { id: last.id, from: toSender(last.from), text: last.text ?? "", sentAt: last.sentAt }
      : { id: `${api.id}_none`, from: "zukki", text: "", sentAt: "" },
  };
}

function statusLineOf(api: ApiConversation): string {
  if (!api.job) return api.chatOpen ? "waiting for you" : "closed";
  if (api.job.state === "customer_approved") return api.job.arrivalWindow ? `visit ${api.job.arrivalWindow}` : "approved";
  return STATUS_LINES[api.job.state] ?? "closed";
}

function toSender(from: string): Sender {
  return from === "customer" || from === "owner" ? from : "zukki";
}

// Media rows have no text of their own: the owner sees what was sent, and a voice note's transcript.
function messageText(message: ApiMessage): string {
  if (message.text) return message.text;
  const media = message.media;
  if (media?.kind === "audio") return media.transcript ? `Voice note: "${media.transcript}"` : "Voice note";
  if (media?.kind === "video") return "Video";
  if (media?.kind === "image") return "Photo";
  return message.kind === "location" ? "Shared a location" : "";
}

function toMessage(message: ApiMessage): Message[] {
  const text = messageText(message);
  if (!text) return [];
  const from = toSender(message.from);
  const base: Message = { id: message.id, from, text, sentAt: message.sentAt };
  return [from === "owner" && message.delivery ? { ...base, delivery: message.delivery } : base];
}

// The Chats list in live mode: every chat this owner's businesses accepted, newest first.
export async function listLiveConversations(api: OwnerApi): Promise<Conversation[]> {
  return (await api.get<ApiConversation[]>("/conversations?limit=100")).map(toConversation);
}

export function createLiveConversationsService(api: OwnerApi): ConversationsService {
  // Option B keeps the API's draft id until the owner picks a version.
  const draftIds = new Map<string, ID>();
  const draftKey = (conversationId: ID, original: string) => `${conversationId}|${original}`;

  async function find(id: ID): Promise<ApiConversation | null> {
    const chats = await api.get<ApiConversation[]>("/conversations?limit=100");
    return chats.find((chat) => chat.id === id) ?? null;
  }

  async function suggestedRange(offerId: ID): Promise<MoneyRange> {
    const offer = await api.get<{ suggestedQuote: MoneyRange | null }>(`/offers/${offerId}`);
    return offer.suggestedQuote ?? { min: 0, max: 0 };
  }

  return {
    getConversation: async (id) => {
      const chat = await find(id);
      return chat && toConversation(chat);
    },

    getQuoteSuggestion: async (conversationId): Promise<QuoteSuggestion | null> => {
      const chat = await find(conversationId);
      if (!chat?.job) return null;
      return { jobId: chat.job.id, suggestedQuote: await suggestedRange(chat.offerId) };
    },

    getMessages: async (conversationId) => {
      if (!(await find(conversationId))) return null;
      const page = await api.get<ApiMessage[]>(`/conversations/${conversationId}/messages?limit=200`);
      void api.post(`/conversations/${conversationId}/read`).catch(() => undefined);
      return page.flatMap(toMessage);
    },

    sendMessage: async (conversationId, text, { polish }) => {
      if (!(await find(conversationId))) return null;
      if (polish) {
        const draft = await api.post<{ draftId: ID; original: string; polished: string | null; language: string | null }>(
          `/conversations/${conversationId}/drafts`,
          { text },
        );
        draftIds.set(draftKey(conversationId, draft.original), draft.draftId);
        return { original: draft.original, polished: draft.polished ?? draft.original, language: draft.language ?? "English" };
      }
      const sent = await api.post<Sent>(`/conversations/${conversationId}/messages`, { text });
      return { sent: buildAsWrittenMessage(sent, text) };
    },

    sendPolishChoice: async (conversationId, preview, choice) => {
      const draftId = draftIds.get(draftKey(conversationId, preview.original));
      const sent = draftId
        ? await api.post<Sent>(`/drafts/${draftId}/send`, { usePolished: choice === "zukki" })
        : await api.post<Sent>(`/conversations/${conversationId}/messages`, {
            text: choice === "zukki" ? preview.polished : preview.original,
          });
      if (draftId) draftIds.delete(draftKey(conversationId, preview.original));
      return buildChosenMessage(sent, preview, choice);
    },
  };
}
