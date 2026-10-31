import { sharedThreadStore } from "../../../shared/data/threadStore.ts";
import { createConversationsService, createFakeConversationsClient } from "../services/conversationsService.ts";
import type { ConversationsService } from "../services/conversationsService.ts";

// The default service of the chat hook until Supabase exists. It reads and writes the shared thread
// store, so a quote sent from the jobs side shows up in the conversation. Every call hands out the same service.
export function sharedDemoConversationsService(): ConversationsService {
  sharedService ??= createConversationsService(createFakeConversationsClient({ threads: sharedThreadStore() }));
  return sharedService;
}

// Tests start every case from the seed: the next consumer gets a fresh service again.
export function resetSharedDemoConversationsService(): void {
  sharedService = null;
}

let sharedService: ConversationsService | null = null;
