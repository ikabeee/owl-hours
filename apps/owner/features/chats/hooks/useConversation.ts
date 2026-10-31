import { useEffect, useState, useSyncExternalStore } from "react";
import type { ID } from "../../../shared/data/types.ts";
import type { ChatView, ConversationSnapshot, SendOutcome } from "../lib/chatView.ts";
import type { PolishChoice } from "../lib/ownerDelivery.ts";
import { liveOwnerApi } from "../../../lib/liveOwnerApi";
import { createLiveConversationsService } from "../services/conversationsLive.ts";
import { createConversationsService, createFakeConversationsClient } from "../services/conversationsService.ts";
import type { ConversationsService } from "../services/conversationsService.ts";
import { createConversationSession } from "./conversationSession.ts";
import type { ConversationSession } from "./conversationSession.ts";

export type ConversationDeps = { service: ConversationsService };

// Serializable by design: the chat crosses into the DOM component as props; the actions are top-level async callbacks.
export type ConversationView = ChatView & {
  send: (text: string) => Promise<SendOutcome>;
  sendChoice: (choice: PolishChoice) => Promise<void>;
  setPolishEnabled: (enabled: boolean) => Promise<void>;
};

// "loading" and "not_found" draw nothing; "failed" draws the error state and retries the load.
export type Conversation =
  | { status: "loading" | "not_found" }
  | { status: "failed"; retry: () => Promise<void> }
  | { status: "ready"; view: ConversationView };

const LOADING: ConversationSnapshot = { status: "loading" };
const NO_SESSION = { subscribe: () => () => {}, getSnapshot: () => LOADING };

// The polish switch is session state, default off, until Settings can provide the default.
export function useConversation(id: ID, deps?: Partial<ConversationDeps>): Conversation {
  const [defaults] = useState(createDefaultDeps);
  const session = useSession(deps?.service ?? defaults.service, id);
  const store = session ?? NO_SESSION;
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  if (!session) return { status: "loading" };

  return toConversation(session, snapshot);
}

// One session per service and id; the previous one is disposed so its late results are ignored.
function useSession(service: ConversationsService, id: ID): ConversationSession | null {
  const [owned, setOwned] = useState<{ service: ConversationsService; id: ID; session: ConversationSession } | null>(null);

  useEffect(() => {
    const session = createConversationSession(service, id);
    setOwned({ service, id, session });
    void session.load();
    return session.dispose;
  }, [service, id]);

  return owned?.service === service && owned.id === id ? owned.session : null;
}

function toConversation(session: ConversationSession, snapshot: ConversationSnapshot): Conversation {
  if (snapshot.status === "failed") return { status: "failed", retry: session.load };
  if (snapshot.status !== "ready") return { status: snapshot.status };

  return {
    status: "ready",
    view: {
      ...snapshot.chat,
      send: session.send,
      sendChoice: session.sendChoice,
      setPolishEnabled: async (enabled) => session.setPolishEnabled(enabled),
    },
  };
}

function createDefaultDeps(): ConversationDeps {
  const api = liveOwnerApi();
  return api ? { service: createLiveConversationsService(api) } : createDemoDeps();
}

function createDemoDeps(): ConversationDeps {
  return { service: createConversationsService(createFakeConversationsClient()) };
}
