import { useEffect, useRef, useState, type SetStateAction } from 'react';
import type { StoryPack } from '../lib/storyPack.ts';
import {
  acceptEditorSave, applyEditorSave, editorIsDirty, editorMatchesSubmission,
  reconcileEditor, type StoryPackEditorState,
} from '../lib/storyPackEditor.ts';

export function useStoryPackEditor(selected: StoryPack | null) {
  const [editor, setEditor] = useState(() => acceptEditorSave(selected));
  const latest = useRef(editor);
  const selection = useRef(selected?.id);
  selection.current = selected?.id;
  function commit(next: StoryPackEditorState) {
    latest.current = next;
    setEditor(next);
  }
  useEffect(() => { commit(reconcileEditor(latest.current, selected)); }, [selected]);
  function setDraft(value: SetStateAction<StoryPack | null>) {
    const current = latest.current;
    commit({ ...current, draft: typeof value === 'function' ? value(current.draft) : value });
  }
  function acceptSaved(saved: StoryPack, submitted: StoryPack): boolean {
    if (selection.current !== submitted.id) return false;
    const matches = editorMatchesSubmission(latest.current, submitted);
    commit(applyEditorSave(latest.current, submitted, saved));
    return matches;
  }
  return { draft: editor.draft, dirty: editorIsDirty(editor), setDraft, acceptSaved };
}
