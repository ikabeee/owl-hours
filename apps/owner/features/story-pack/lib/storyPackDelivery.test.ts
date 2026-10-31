import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deliverNativeStoryPack } from './storyPackDelivery.ts';

test('native delivery saves exact ZIP bytes, awaits share, and removes temporary file', async () => {
  const calls: string[] = [];
  await deliverNativeStoryPack({ filename: 'zukki-story-pack.zip', base64: 'UEsDBA==' }, {
    available: async () => true,
    save: async (payload) => { assert.equal(payload.base64, 'UEsDBA=='); calls.push('save'); return 'file:///cache/test.zip'; },
    share: async uri => { assert.equal(uri, 'file:///cache/test.zip'); calls.push('share'); },
    remove: async () => { calls.push('remove'); },
  });
  assert.deepEqual(calls, ['save', 'share', 'remove']);
});

test('unavailable sharing never writes owner photos', async () => {
  await assert.rejects(deliverNativeStoryPack({ filename: 'zukki-story-pack.zip', base64: 'UEsDBA==' }, {
    available: async () => false, save: async () => { throw new Error('must not write'); },
    share: async () => {}, remove: async () => {},
  }), /unavailable/);
});

test('share failure cleans up and does not report success', async () => {
  let removed = false;
  await assert.rejects(deliverNativeStoryPack({ filename: 'zukki-story-pack.zip', base64: 'UEsDBA==' }, {
    available: async () => true, save: async () => 'file:///cache/test.zip',
    share: async () => { throw new Error('share failed'); }, remove: async () => { removed = true; },
  }), /share failed/);
  assert.equal(removed, true);
});

test('bridge rejects unsafe filenames and malformed binary payloads', async () => {
  const deps = { available: async () => true, save: async () => { throw new Error('must not save'); }, share: async () => {}, remove: async () => {} };
  for (const payload of [{ filename: '../private.zip', base64: 'UEsDBA==' }, { filename: 'zukki-story-pack.zip', base64: 'UEsD$A==' }]) {
    await assert.rejects(deliverNativeStoryPack(payload, deps), /Invalid/);
  }
});
