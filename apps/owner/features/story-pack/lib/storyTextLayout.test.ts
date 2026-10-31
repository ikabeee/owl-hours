import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitStoryText } from './storyTextLayout.ts';

test('maximum CJK copy fits footer without dropping text', () => {
  const title = '修'.repeat(60), body = '好'.repeat(280);
  const layout = fitStoryText(title, body, (text, size) => Array.from(text).length * size);
  assert.equal(layout.title.lines.join(''), title);
  assert.equal(layout.body.lines.join(''), body);
  assert.ok(layout.bottom <= 1810);
});

test('explicit newlines and long words wrap without truncation', () => {
  const layout = fitStoryText('A\nB', 'x'.repeat(280), (text, size) => text.length * size);
  assert.deepEqual(layout.title.lines, ['A', 'B']);
  assert.equal(layout.body.lines.join(''), 'x'.repeat(280));
  assert.ok(layout.bottom <= 1810);
});
