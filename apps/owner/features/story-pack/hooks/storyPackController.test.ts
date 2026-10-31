import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStoryPackController } from './storyPackController.ts';
import { createStoryPackService, createFakeStoryPackClient } from '../services/storyPackService.ts';
import { storyPackServiceCopys as copy } from '../copys/storyPackServiceCopys.ts';
import { reconcileEditor } from '../lib/storyPackEditor.ts';

async function fixture() {
  const service = createStoryPackService(createFakeStoryPackClient());
  const controller = createStoryPackController({ mode: 'demo', auth: null, service });
  await controller.start();
  const pack = await controller.createFromJob(controller.getSnapshot().sources[0].id);
  assert.ok(pack);
  return { service, controller, pack };
}

test('failed save preserves dirty editor text and exposes the known service error', async () => {
  const { service, controller, pack } = await fixture();
  const editor = { saved: pack, draft: { ...pack, caption: 'Unsaved owner text' } };
  service.updateDraft = async () => { throw new Error(copy.changedSinceReview); };
  assert.equal(await controller.updateDraft({ caption: editor.draft.caption }), null);
  const refreshed = controller.getSnapshot().selectedPack;
  assert.equal(controller.getSnapshot().error, copy.changedSinceReview);
  assert.equal(reconcileEditor(editor, refreshed).draft?.caption, 'Unsaved owner text');
});

test('authorization does not create a receipt; completed export leaves persisted approved status unchanged across reload', async () => {
  const { controller } = await fixture();
  const saved = await controller.updateDraft({ platforms: { facebook: true, instagram: false } });
  assert.ok(saved);
  const source = controller.getSnapshot().sources[0];
  await controller.approve({ expectedUpdatedAt: saved.updatedAt, expectedMedia: source.assets.map(({ id, role, revision }) => ({ id, role: role as 'before'|'after', revision: revision! })) });
  await controller.prepareHandoff();
  assert.equal(controller.getSnapshot().deliveryReceipt, null);
  await controller.markHandoffDelivered(saved.id);
  assert.equal(controller.getSnapshot().selectedPack?.status, 'approved');
  assert.equal(controller.getSnapshot().deliveryReceipt?.packId, saved.id);
  await controller.reload();
  assert.equal(controller.getSnapshot().selectedPack?.status, 'approved');
});

test('a stopped controller cannot accept a pending mutation or create a delivery receipt', async () => {
  const { service, controller, pack } = await fixture();
  let resolve!: (value: typeof pack) => void;
  service.updateDraft = () => new Promise(done => { resolve = done; });
  const pending = controller.updateDraft({ caption: 'pending' });
  controller.stop();
  resolve({ ...pack, caption: 'late result' });
  assert.equal(await pending, null);
  await controller.markHandoffDelivered(pack.id);
  assert.equal(controller.getSnapshot().deliveryReceipt, null);
});

test('owner change discards pending mutations and clears previous owner data immediately', async () => {
  const { service, pack } = await fixture();
  type Owner = {access_token:string;user:{id:string;email:string}};
  let authChanged!: (session: Owner|null) => void;
  const auth = {
    restore: async () => ({access_token:'A',user:{id:'owner-a',email:'a@example.test'}}),
    subscribe: (callback: typeof authChanged) => { authChanged=callback;return()=>{}; },
    getAccessToken: async () => 'token', sendCode:async()=>false,verifyCode:async()=>false,signOut:async()=>{},
  };
  const controller=createStoryPackController({mode:'live',auth,service});
  await controller.start();
  await controller.selectPack(pack.id);
  let resolve!: (value: typeof pack) => void;
  service.updateDraft=()=>new Promise(done=>{resolve=done;});
  const pending=controller.updateDraft({caption:'owner-a edit'});
  // Hold the next owner's read; no old rows may remain while it is pending.
  service.listSources=()=>new Promise(()=>{});
  authChanged({access_token:'B',user:{id:'owner-b',email:'b@example.test'}});
  assert.deepEqual(controller.getSnapshot().packs,[]);
  assert.equal(controller.getSnapshot().selectedPack,null);
  resolve({...pack,caption:'late owner-a result'});
  assert.equal(await pending,null);
  assert.equal(controller.getSnapshot().selectedPack,null);
  assert.equal(controller.getSnapshot().sessionEmail,'b@example.test');
});

test('approval returns refreshed eligibility rather than the conservative RPC receipt', async () => {
  const { controller, service } = await fixture();
  const saved=await controller.updateDraft({platforms:{facebook:true,instagram:false}});
  assert.ok(saved);
  const review=service.approve;
  service.approve=async(id,snapshot)=>({...await review(id,snapshot),canHandoff:false});
  const source=controller.getSnapshot().sources[0];
  const approved=await controller.approve({expectedUpdatedAt:saved.updatedAt,expectedMedia:source.assets.map(({id,role,revision})=>({id,role:role as 'before'|'after',revision:revision!}))});
  assert.equal(approved?.status,'approved');
  assert.equal(approved?.canHandoff,true);
  assert.equal(controller.getSnapshot().selectedPack?.canHandoff,true);
});

test('save result cannot adopt an unseen newer draft version from the background refresh', async () => {
  const { controller, service, pack } = await fixture();
  service.updateDraft=async()=>({...pack,caption:'reviewed owner edit',updatedAt:'saved-version'});
  service.listPacks=async()=>[{...pack,caption:'unseen concurrent edit',updatedAt:'newer-version'}];
  const saved=await controller.updateDraft({caption:'reviewed owner edit'});
  assert.equal(saved?.updatedAt,'saved-version');
  assert.equal(saved?.caption,'reviewed owner edit');
});

test('a pending save cannot navigate back after the owner selects another pack', async () => {
  const { controller, service, pack }=await fixture();
  const second=await controller.createFromJob(controller.getSnapshot().sources[0].id);
  assert.ok(second);
  await controller.selectPack(pack.id);
  let resolve!:(value:typeof pack)=>void;
  service.updateDraft=()=>new Promise(done=>{resolve=done;});
  const pending=controller.updateDraft({caption:'submitted A'});
  await controller.selectPack(second.id);
  resolve({...pack,caption:'saved A'});
  await pending;
  assert.equal(controller.getSnapshot().selectedPack?.id,second.id);
});
