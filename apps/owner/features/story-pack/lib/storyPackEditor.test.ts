import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { StoryPack } from './storyPack.ts';
import {
  acceptEditorSave,
  applyEditorSave,
  editorMatchesSubmission,
  reconcileEditor,
  type StoryPackEditorState,
} from './storyPackEditor.ts';

function createSamplePack(overrides: Partial<StoryPack> = {}): StoryPack {
  return {
    id: 'pack-1',
    sourceJobId: 'job-1',
    sourceMediaIds: ['media-before', 'media-after'],
    canHandoff: false,
    businessName: 'Northside Plumbing (demo)',
    jobTitle: 'Bathroom leak repair',
    caption: 'Original draft caption',
    slides: [
      { title: 'Slide 1', body: 'Body 1' },
      { title: 'Slide 2', body: 'Body 2' },
      { title: 'Slide 3', body: 'Body 3' },
    ],
    platforms: { facebook: false, instagram: false },
    status: 'draft',
    isDemo: true,
    createdAt: '2026-10-30T12:00:00.000Z',
    updatedAt: '2026-10-30T12:00:00.000Z',
    ...overrides,
  };
}

test('S12: dirty draft + selected pack now approved -> reconciled draft has status approved and keeps the edited caption', () => {
  const initial = createSamplePack({
    status: 'draft',
    caption: 'Original draft caption',
    canHandoff: false,
  });
  const editor: StoryPackEditorState = {
    saved: initial,
    draft: { ...initial, caption: 'Unsaved owner text' },
  };
  const selected: StoryPack = {
    ...initial,
    status: 'approved',
    canHandoff: true,
    updatedAt: '2026-10-30T12:05:00.000Z',
    approvedAt: '2026-10-30T12:05:00.000Z',
    caption: 'Remote server caption',
  };

  const next = reconcileEditor(editor, selected);

  assert.equal(next.draft?.status, 'approved');
  assert.equal(next.draft?.caption, 'Unsaved owner text');
  assert.equal(next.draft?.canHandoff, true);
  assert.equal(next.draft?.updatedAt, '2026-10-30T12:05:00.000Z');
  assert.equal(next.saved?.status, 'approved');
});

test('S12: a fresh server version does not overwrite dirty edits; selecting another pack resets the editor', () => {
  const pack = createSamplePack();
  const editor: StoryPackEditorState = {
    saved: pack,
    draft: { ...pack, caption: 'keep this edit' },
  };
  const updated = reconcileEditor(editor, { ...pack, updatedAt: 'new-version', caption: 'remote' });
  assert.equal(updated.draft?.caption, 'keep this edit');

  const another = reconcileEditor(editor, { ...pack, id: 'another', caption: 'another pack' });
  assert.equal(another.draft?.caption, 'another pack');
});

test('S12: accepting a successful save resets the dirty baseline so a later server refresh is accepted', () => {
  const pack = createSamplePack({
    caption: 'saved owner edit',
    updatedAt: 'saved-version',
  });
  const editor = acceptEditorSave(pack);
  const next = reconcileEditor(editor, {
    ...pack,
    caption: 'new server copy',
    updatedAt: 'newer-version',
  });
  assert.equal(next.draft?.caption, 'new server copy');
});

test('S12: save completion preserves edits typed while the submitted snapshot was pending', () => {
  const pack = createSamplePack();
  const submitted = { ...pack, caption: 'submitted A' };
  const editor: StoryPackEditorState = {
    saved: pack,
    draft: { ...pack, caption: 'newer B' },
  };
  const saved = { ...submitted, updatedAt: 'saved-A' };
  const result = applyEditorSave(editor, submitted, saved);

  assert.equal(result.saved?.caption, 'submitted A');
  assert.equal(result.draft?.caption, 'newer B');
  assert.equal(editorMatchesSubmission(result, submitted), false);
  assert.equal(reconcileEditor(result, saved).draft?.caption, 'newer B');
});

test('S12: an old save response cannot replace an editor opened for another pack', () => {
  const pack = createSamplePack();
  const other = { ...pack, id: 'other', caption: 'other local text' };
  const current: StoryPackEditorState = { saved: other, draft: other };
  assert.deepEqual(applyEditorSave(current, pack, { ...pack, updatedAt: 'saved' }), current);
});
