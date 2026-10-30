import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportAndDeliverStoryPack } from './storyPackExportController.ts';
import { createStoryPackService, createFakeStoryPackClient } from '../services/storyPackService.ts';

async function approved() {
  const service = createStoryPackService(createFakeStoryPackClient());
  const source = (await service.listSources())[0];
  const draft = await service.createFromJob(source.id);
  const saved = await service.updateDraft(draft.id, { platforms: { facebook: true, instagram: false } });
  await service.approve(saved.id, { expectedUpdatedAt: saved.updatedAt, expectedMedia: source.assets.map(({ id, role, revision }) => ({ id, role: role as 'before'|'after', revision: revision! })) });
  return () => service.prepareHandoff(saved.id);
}
const images = [1,2,3].map(index => ({name:`story-0${index}.png`,bytes:new Uint8Array([1,2,3])}));

test('export controller authorizes, renders, reauthorizes, delivers base64 then records receipt', async () => {
  const authorize = await approved(); const calls: string[] = [];
  await exportAndDeliverStoryPack({
    authorize: async () => { calls.push('authorize'); return authorize(); },
    render: async () => { calls.push('render'); return images; },
    deliver: async payload => { calls.push('deliver'); assert.equal(typeof payload.base64, 'string'); assert.ok(payload.base64.startsWith('UEsD')); assert.equal('bytes' in payload,false); },
    delivered: async () => { calls.push('receipt'); },
  });
  assert.deepEqual(calls, ['authorize','render','authorize','deliver','receipt']);
});

test('delivery failure never records a local success receipt', async () => {
  const authorize = await approved(); let receipt = false;
  await assert.rejects(exportAndDeliverStoryPack({ authorize, render:async()=>images,
    deliver:async()=>{throw new Error('sharing failed');}, delivered:async()=>{receipt=true;},
  }), /sharing failed/);
  assert.equal(receipt,false);
});
