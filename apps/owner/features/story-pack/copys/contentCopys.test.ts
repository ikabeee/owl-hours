import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentCopys } from './contentCopys.ts';

const copyText = JSON.stringify(contentCopys);

test('copy outside the handoff is gone', () => {
  assert.equal(copyText.includes('Zukki · day shift'), false);
  assert.equal(copyText.includes('One shop. Two shifts.'), false);
  assert.equal(copyText.includes('Night Sales'), false);
});

test('dead and duplicate copy keys are gone', () => {
  for (const key of ['dayShift', 'workspaceEyebrow', 'workspaceLine', 'saveSuccess', 'approveSuccess', 'prepareSuccess', 'chooseFormat']) {
    assert.equal(key in contentCopys, false, key);
  }
});

test('source line is composed in copy, not in JSX', () => {
  assert.equal(contentCopys.sourceLine('Northside Plumbing', false), 'Source job: Northside Plumbing');
  assert.equal(contentCopys.sourceLine('Northside Plumbing', true), 'Source job: Northside Plumbing · DEMO SAMPLE');
});

test('pack row meta and label are composed in copy, not in JSX', () => {
  assert.equal(contentCopys.packMeta('Northside Plumbing', false), 'Northside Plumbing');
  assert.equal(contentCopys.packMeta('Northside Plumbing', true), 'DEMO · Northside Plumbing');
  assert.equal(contentCopys.packRowLabel('Leak repair', 'Draft'), 'Leak repair - Draft');
});
