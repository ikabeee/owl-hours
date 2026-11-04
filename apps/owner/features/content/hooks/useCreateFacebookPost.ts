import { useCallback, useEffect, useState } from "react";
import type { ID, PostDraft } from "../../../shared/data/types.ts";
import type { ListedAccount, AccountsService } from "../services/accountsService.ts";
import type { PostsService } from "../services/postsService.ts";
import { contentRuntime } from "./contentRuntime.ts";

export type FacebookPageOption = { id: ID; name: string };

export type CreateFacebookPostView = {
  pages: FacebookPageOption[];
  selectedPageId: string;
  prompt: string;
  canGenerate: boolean;
  isGenerating: boolean;
  error: string | null;
  onSelectPage: (id: string) => void;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => Promise<PostDraft | null>;
};

export type CreateFacebookPostState =
  | { status: "loading" }
  | { status: "error"; retry: () => Promise<void> }
  | { status: "ready"; view: CreateFacebookPostView };

export type CreateFacebookPostDeps = {
  accountsService: AccountsService;
  postsService: PostsService;
};

export function useCreateFacebookPost(deps?: Partial<CreateFacebookPostDeps>): CreateFacebookPostState {
  const [defaults] = useState(createDefaults);
  const accountsService = deps?.accountsService ?? defaults.accountsService;
  const postsService = deps?.postsService ?? defaults.postsService;
  const [pages, setPages] = useState<FacebookPageOption[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const accounts = await accountsService.getAccounts();
      const connectedPages = accounts
        .filter((account) => account.kind === "facebook_page" && account.status === "connected")
        .flatMap(asPageOption);
      setPages(connectedPages);
      setSelectedPageId((current) => current && connectedPages.some((page) => page.id === current)
        ? current
        : connectedPages.length === 1 ? connectedPages[0]!.id : "");
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [accountsService]);

  useEffect(() => {
    void load();
  }, [load]);

  const onGenerate = useCallback(async (): Promise<PostDraft | null> => {
    if (!postsService.canCreateAiDraft) {
      setError("Creating a Muse post needs the live owner API.");
      return null;
    }
    if (!selectedPageId) {
      setError("Choose a connected Facebook Page.");
      return null;
    }
    if (!prompt.trim()) {
      setError("Tell Muse what you want the post to say.");
      return null;
    }
    setIsGenerating(true);
    setError(null);
    try {
      return await postsService.createAiDraft(prompt.trim(), selectedPageId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Muse could not create the post. Try again.");
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [postsService, prompt, selectedPageId]);

  if (status === "loading") return { status: "loading" };
  if (status === "error") return { status: "error", retry: load };

  return {
    status: "ready",
    view: {
      pages,
      selectedPageId,
      prompt,
      canGenerate: postsService.canCreateAiDraft && pages.length > 0 && Boolean(prompt.trim()) && !isGenerating,
      isGenerating,
      error,
      onSelectPage: setSelectedPageId,
      onPromptChange: setPrompt,
      onGenerate,
    },
  };
}

function asPageOption(account: ListedAccount): FacebookPageOption[] {
  return account.id ? [{ id: account.id, name: account.name }] : [];
}

function createDefaults(): CreateFacebookPostDeps {
  const root = contentRuntime();
  return { accountsService: root.accountsService, postsService: root.postsService };
}
