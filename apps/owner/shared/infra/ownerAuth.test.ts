import assert from 'node:assert/strict';
import { it } from 'node:test';
import { createChunkedSecureStorage } from './ownerSecureStorage.ts';
import { createOwnerCallbackHandler, startOwnerAuthLifecycle } from './ownerAuthLifecycle.ts';
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

it('exchanges only exact callback codes, deduplicates replay, and exposes server errors', async () => {
  const codes:string[]=[];
  const handler=createOwnerCallbackHandler({exchangeCodeForSession:async(code:string)=>{codes.push(code);return {error:code==='bad'?Error('bad'):null};}},'zukki-owner://auth/callback');
  assert.equal(await handler('https://evil.test/auth/callback?code=stolen'),false);
  assert.equal(await handler('zukki-owner://auth/other?code=wrong'),false);
  assert.equal(await handler('zukki-owner://auth/callback?code=good'),true);
  assert.equal(await handler('zukki-owner://auth/callback?code=good'),true);
  assert.deepEqual(codes,['good']);
  await assert.rejects(handler('zukki-owner://auth/callback?error=access_denied'),/sign-in/i);
  await assert.rejects(handler('zukki-owner://auth/callback?code=bad'),/sign-in/i);
});

it('handles cold and warm URLs, refreshes only while active, reports failures, and cleans up listeners', async () => {
  const callbacks:{url?:(url:string)=>void;state?:(state:string)=>void}={};
  const events:string[]=[];
  const stop=startOwnerAuthLifecycle({
    initialUrl:async()=> 'zukki-owner://auth/callback?code=cold',
    listenUrl:cb=>{callbacks.url=cb;return()=>events.push('remove-url');},
    listenState:cb=>{callbacks.state=cb;return()=>events.push('remove-state');},
    currentState:()=> 'active',
    handleUrl:async url=>{events.push(url);if(url==='bad')throw Error('callback failed');},
    startRefresh:()=>events.push('start'),stopRefresh:()=>events.push('stop'),
    onError:error=>events.push(error.message),
  });
  await new Promise(resolve=>setImmediate(resolve));
  callbacks.url?.('warm');callbacks.url?.('bad');callbacks.state?.('background');callbacks.state?.('active');
  await new Promise(resolve=>setImmediate(resolve));stop();
  assert.deepEqual(events,['start','zukki-owner://auth/callback?code=cold','warm','bad','stop','start','callback failed','remove-url','remove-state','stop']);
});
