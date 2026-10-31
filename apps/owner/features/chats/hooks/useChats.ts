import { useCallback, useEffect, useState } from "react";
import type { Conversation, ISODate } from "../../../shared/data/types.ts";
import { chatRowOf } from "../lib/chatRow.ts";
import type { ChatRowView } from "../lib/chatRow.ts";
import type { ConversationsService } from "../services/conversationsService.ts";
import { defaultChatsNow, defaultConversationsService } from "./defaultConversationsService.ts";

export type ChatsDeps = { service: ConversationsService; now: () => ISODate };

// "loading" draws nothing; "failed" draws the error state and retries the load.
export type ChatsList =
  | { status: "loading" }
  | { status: "failed"; retry: () => Promise<void> }
  | { status: "ready"; rows: ChatRowView[] };

// `reload` refetches the list without clearing the rows shown; call it when the tab regains focus.
export type ChatsListResult = { chats: ChatsList; reload: () => void };

// Pass a stable service (a module constant or memoized): changing it reloads the list.
export function useChats(deps?: Partial<ChatsDeps>): ChatsListResult {
  const [defaults] = useState(createDefaultDeps);
  const service = deps?.service ?? defaults.service;
  const now = deps?.now ?? defaults.now;
  const [loaded, setLoaded] = useState<Conversation[] | "loading" | "failed">("loading");
  const [reloadToken, setReloadToken] = useState(0);
  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let isCurrent = true;
    service
      .getConversations()
      .then((conversations) => {
        if (isCurrent) setLoaded(conversations);
      })
      .catch(() => {
        if (isCurrent) setLoaded((shown) => (Array.isArray(shown) ? shown : "failed"));
      });
    return () => {
      isCurrent = false;
    };
  }, [service, reloadToken]);

  return { chats: toChatsList(loaded, now(), reload), reload };
}

function toChatsList(loaded: Conversation[] | "loading" | "failed", now: ISODate, reload: () => void): ChatsList {
  if (loaded === "loading") return { status: "loading" };
  if (loaded === "failed") return { status: "failed", retry: async () => reload() };
  return { status: "ready", rows: loaded.map((conversation) => chatRowOf(conversation, now)) };
}

function createDefaultDeps(): ChatsDeps {
  return { service: defaultConversationsService(), now: defaultChatsNow };
}
