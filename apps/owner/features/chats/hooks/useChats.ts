import { useCallback, useEffect, useState } from "react";
import { liveOwnerApi } from "../../../lib/liveOwnerApi";
import { conversations as demoConversations } from "../../../shared/data/mock.ts";
import type { Conversation } from "../../../shared/data/types.ts";
import { chatRow } from "../lib/chatRow.ts";
import type { ChatRowView } from "../lib/chatRow.ts";
import { listLiveConversations } from "../services/conversationsLive.ts";

// Live mode checks for new messages this often while the list is open.
const POLL_MS = 15_000;

// The rows are null while they first load; `reload` refetches without clearing them.
export type ChatsResult = { rows: ChatRowView[] | null; reload: () => void };

export function useChats(): ChatsResult {
  const [source] = useState(createSource);
  const [chats, setChats] = useState<Conversation[] | null>(null);
  const [token, setToken] = useState(0);
  const reload = useCallback(() => setToken((value) => value + 1), []);

  useEffect(() => {
    let isCurrent = true;
    source
      .list()
      .then((loaded) => isCurrent && setChats(loaded))
      .catch(() => isCurrent && setChats((current) => current ?? []));
    return () => {
      isCurrent = false;
    };
  }, [source, token]);

  useEffect(() => {
    if (!source.live) return;
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [source, reload]);

  return { rows: chats && chats.map(chatRow), reload };
}

function createSource() {
  const api = liveOwnerApi();
  return api
    ? { live: true, list: () => listLiveConversations(api) }
    : { live: false, list: async () => structuredClone(demoConversations) };
}
