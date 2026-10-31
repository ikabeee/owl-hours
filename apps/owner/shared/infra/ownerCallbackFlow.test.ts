import assert from 'node:assert/strict';
import { it } from 'node:test';
import { createOwnerCallbackHandler } from './ownerAuthLifecycle.ts';
import { createChunkedSecureStorage } from './ownerSecureStorage.ts';

it('passes the Supabase PKCE flow ID to select the matching persisted verifier', async () => {
  let actual: unknown;
  const handler=createOwnerCallbackHandler({exchangeCodeForSession:async(...args:unknown[])=>{actual=args;return {error:null};}},'zukki-owner://auth/callback');
  await handler('zukki-owner://auth/callback?code=fixture&sb_flow_id=flow-fixture');
  assert.deepEqual(actual,['fixture',{flowId:'flow-fixture'}]);
});
it('removes the active pointer before reporting failed signout chunk cleanup', async () => {
  const values=new Map<string,string>();let fail=false;
  const storage=createChunkedSecureStorage({getItem:async key=>values.get(key)??null,
    setItem:async(key,value)=>{values.set(key,value);},
    removeItem:async key=>{if(fail&&key!=='session')throw Error('locked');values.delete(key);}});
  await storage.setItem('session','session-value');fail=true;
  await assert.rejects(storage.removeItem('session'),/secure session/i);
  assert.equal(await storage.getItem('session'),null);
});
