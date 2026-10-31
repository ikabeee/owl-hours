import { useState } from 'react';
import type { StoryPack } from '../lib/storyPack.ts';
import {
  approveStoryPackDraft,
  saveStoryPackDraft,
  type StoryPackDraftDeps,
} from './storyPackDraftController.ts';

export type UseStoryPackDraftDeps = Omit<StoryPackDraftDeps, 'draft'> & {
  draft: StoryPack | null;
};

export function useStoryPackDraft(deps: UseStoryPackDraftDeps) {
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  async function saveDraft(): Promise<StoryPack | null> {
    const { draft } = deps;
    if (!draft) return null;
    setSaving(true);
    try {
      return await saveStoryPackDraft({ ...deps, draft });
    } finally {
      setSaving(false);
    }
  }

  async function approveDraft(): Promise<void> {
    const { draft } = deps;
    if (!draft) return;
    setApproving(true);
    setSaving(true);
    setApprovalError(null);
    try {
      const { error } = await approveStoryPackDraft({ ...deps, draft });
      setApprovalError(error);
    } finally {
      setSaving(false);
      setApproving(false);
    }
  }

  return {
    saving,
    approving,
    approvalError,
    saveDraft,
    approveDraft,
    clearApprovalError: () => setApprovalError(null),
  };
}
