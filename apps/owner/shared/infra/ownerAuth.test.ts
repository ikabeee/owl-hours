import assert from 'node:assert/strict';
import { it } from 'node:test';
import { createChunkedSecureStorage } from './ownerSecureStorage.ts';
import * as lifecycle from './ownerAuthLifecycle.ts';
import { startOwnerAuthLifecycle } from './ownerAuthLifecycle.ts';
import { ownerAuthOptions } from './ownerSessionClient.ts';

it('uses PKCE and independent token refresh with URL detection disabled', () => {
  const options=ownerAuthOptions({storage:{getItem:async()=>null,setItem:async()=>{},removeItem:async()=>{}},detectSessionInUrl:false});
  assert.equal(options.flowType,'pkce');
  assert.equal(options.autoRefreshToken,true);
  assert.equal(options.detectSessionInUrl,false);
});

it('stores large Unicode sessions in bounded encrypted chunks and removes every part', async () => {
  const values=new Map<string,string>();
  const storage=createChunkedSecureStorage({
    getItem:async key=>values.get(key)??null,
    setItem:async(key,value)=>{assert.ok(new TextEncoder().encode(value).length<=1800);values.set(key,value);},
    removeItem:async key=>{values.delete(key);},
  });
  const session=JSON.stringify({token:'x'.repeat(6000),user:{name:'水晶🦉'.repeat(1000)}});
  await storage.setItem('session',session);
  assert.equal(await storage.getItem('session'),session);
  await storage.removeItem('session');
  assert.equal(await storage.getItem('session'),null);
  assert.equal(values.size,0);
});

it('surfaces persistence errors and preserves the last complete session', async () => {
  const values=new Map<string,string>();let fail=false;
  const storage=createChunkedSecureStorage({getItem:async key=>values.get(key)??null,
    setItem:async(key,value)=>{if(fail)throw Error('platform rejected');values.set(key,value);},
    removeItem:async key=>{values.delete(key);}});
  await storage.setItem('session','old');fail=true;
  await assert.rejects(storage.setItem('session','new'.repeat(3000)),/secure session/i);
  assert.equal(await storage.getItem('session'),'old');
});

it('S2 keeps no magic-link PKCE callback handler', () => {
  assert.equal('createOwnerCallbackHandler' in lifecycle, false);
});

it('refreshes only while active and cleans up the state listener', () => {
  const callbacks:{state?:(state:string)=>void}={};
  const events:string[]=[];
  const stop=startOwnerAuthLifecycle({
    listenState:cb=>{callbacks.state=cb;return()=>events.push('remove-state');},
    currentState:()=> 'active',
    startRefresh:()=>events.push('start'),stopRefresh:()=>events.push('stop'),
  });
  callbacks.state?.('background');callbacks.state?.('active');
  stop();
  callbacks.state?.('active');
  assert.deepEqual(events,['start','stop','start','remove-state','stop']);
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
