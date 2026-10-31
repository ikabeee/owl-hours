import { anaMessages } from "./mock.ts";
import type { ID, Message } from "./types.ts";

// The conversations' messages. Chats reads and writes them; jobs appends the quote message when a quote
// goes out, the way the backend will post it to the thread. Both meet here instead of importing each other.
export type ThreadStore = {
  messages(conversationId: ID): Message[]; // a private copy; an unknown conversation has no messages
  append(conversationId: ID, message: Message): void;
};

// An independent store seeded with Ana's thread.
export function createThreadStore(): ThreadStore {
  return storeOver(seedThreads());
}

// The one module-level store the demo services share.
export function sharedThreadStore(): ThreadStore {
  return sharedStore;
}

// Tests start every case from the seed. The shared store is cleared in place, so a consumer that
// already holds it sees the seed again.
export function resetSharedThreadStore(): void {
  sharedThreads.clear();
  seedThreads().forEach((thread, conversationId) => sharedThreads.set(conversationId, thread));
}

function storeOver(threads: Map<ID, Message[]>): ThreadStore {
  return {
    messages: (conversationId) => structuredClone(threads.get(conversationId) ?? []),
    append: (conversationId, message) => {
      threads.set(conversationId, [...(threads.get(conversationId) ?? []), structuredClone(message)]);
    },
  };
}

function seedThreads(): Map<ID, Message[]> {
  return new Map([["c_ana", structuredClone([...anaMessages])]]);
}

const sharedThreads = seedThreads();
const sharedStore = storeOver(sharedThreads);
