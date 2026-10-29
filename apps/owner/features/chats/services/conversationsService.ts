import { OWNER_TEXT, POLISHED_TEXT, anaMessages, conversations as seedConversations } from "../../../shared/data/mock.ts";
import type { Conversation, ID, ISODate, Message, PolishPreview } from "../../../shared/data/types.ts";
import { buildAsWrittenMessage, buildChosenMessage } from "../lib/ownerDelivery.ts";
import type { MessageStamp, PolishChoice } from "../lib/ownerDelivery.ts";

export type ConversationsClient = {
  findConversation(id: ID): Promise<Conversation | null>;
  listMessages(conversationId: ID): Promise<Message[]>;
  saveMessage(conversationId: ID, message: Message): Promise<void>;
  polish(text: string): Promise<PolishPreview>;
};

export type ConversationsDeps = {
  now: () => ISODate;
  newMessageId: () => ID;
};

// Option A answers {sent}; option B answers the preview the owner must still choose from.
export type SendResult = { sent: Message } | PolishPreview;

export type ConversationsService = {
  getConversation(id: ID): Promise<Conversation | null>;
  getMessages(conversationId: ID): Promise<Message[] | null>;
  sendMessage(conversationId: ID, text: string, options: { polish: boolean }): Promise<SendResult | null>;
  sendPolishChoice(conversationId: ID, preview: PolishPreview, choice: PolishChoice): Promise<Message | null>;
};

export function createConversationsService(
  client: ConversationsClient,
  deps: Partial<ConversationsDeps> = {},
): ConversationsService {
  const { now, newMessageId } = { ...createDefaultDeps(), ...deps };

  const nextStamp = (): MessageStamp => ({ id: newMessageId(), sentAt: now() });

  async function hasConversation(id: ID) {
    return (await client.findConversation(id)) !== null;
  }

  async function append(conversationId: ID, message: Message) {
    await client.saveMessage(conversationId, message);
    return message;
  }

  return {
    getConversation: (id) => client.findConversation(id),

    getMessages: async (conversationId) =>
      (await hasConversation(conversationId)) ? client.listMessages(conversationId) : null,

    sendMessage: async (conversationId, text, { polish }) => {
      if (!(await hasConversation(conversationId))) return null;
      if (polish) return client.polish(text);

      return { sent: await append(conversationId, buildAsWrittenMessage(nextStamp(), text)) };
    },

    sendPolishChoice: async (conversationId, preview, choice) => {
      if (!(await hasConversation(conversationId))) return null;

      return append(conversationId, buildChosenMessage(nextStamp(), preview, choice));
    },
  };
}

// In-memory client seeded with private copies of the demo conversations and Ana's thread.
export function createFakeConversationsClient(): ConversationsClient {
  const conversationsById = new Map(structuredClone(seedConversations).map((conversation) => [conversation.id, conversation]));
  const threadsById = new Map<ID, Message[]>([["c_ana", structuredClone([...anaMessages])]]);

  return {
    findConversation: async (id) => structuredClone(conversationsById.get(id) ?? null),
    listMessages: async (conversationId) => structuredClone(threadsById.get(conversationId) ?? []),
    saveMessage: async (conversationId, message) => {
      const thread = threadsById.get(conversationId) ?? [];
      threadsById.set(conversationId, [...thread, structuredClone(message)]);
    },
    polish: async (text) => ({
      original: text,
      polished: text === OWNER_TEXT ? POLISHED_TEXT : text,
      language: "English",
    }),
  };
}

// Wall clock and a per-service counter; no crypto, so it also runs on Hermes.
function createDefaultDeps(): ConversationsDeps {
  let sentCount = 0;
  return {
    now: () => new Date().toISOString(),
    newMessageId: () => `m_sent_${++sentCount}`,
  };
}
