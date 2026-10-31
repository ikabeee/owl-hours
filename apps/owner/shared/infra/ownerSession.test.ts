import assert from 'node:assert/strict';
import { it } from 'node:test';
import { createOwnerSessionService } from './ownerSessionService.ts';

it('refreshes an expired restored session before issuing an API token', async () => {
  let refreshed = 0;
  const session = createOwnerSessionService({
    getSession: async () => ({ data:{session:{access_token:'expired',expires_at:1,user:{email:'owner@example.test'}}},error:null }),
    refreshSession: async () => { refreshed++; return {data:{session:{access_token:'fresh',expires_at:9999999999,user:{email:'owner@example.test'}}},error:null}; },
    signInWithOtp: async () => ({error:null}),
    signOut: async () => ({error:null}),
    onAuthStateChange: () => ({data:{subscription:{unsubscribe(){}}}}),
  }, () => 2000);
  assert.equal(await session.getAccessToken(),'fresh');
  assert.equal(refreshed,1);
});

it('fails closed if refresh fails, and never returns the expired token', async () => {
  const session = createOwnerSessionService({
    getSession: async () => ({data:{session:{access_token:'expired',expires_at:1,user:{}}},error:null}),
    refreshSession: async () => ({data:{session:null},error:new Error('expired refresh token')}),
    signInWithOtp: async () => ({error:null}),
    signOut: async () => ({error:null}),
    onAuthStateChange: () => ({data:{subscription:{unsubscribe(){}}}}),
  }, () => 2000);
  await assert.rejects(session.getAccessToken(),/Sign in/);
});

it('requests an existing-owner magic link without provisioning another account', async () => {
  let request:unknown;
  const session=createOwnerSessionService({
    getSession:async()=>({data:{session:null},error:null}),refreshSession:async()=>({data:{session:null},error:null}),
    signInWithOtp:async(input)=>{request=input;return {error:null};},signOut:async()=>({error:null}),
    onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
  },Date.now,()=>"https://owner.example.test/content");
  await session.signIn(" owner@example.test ");
  assert.deepEqual(request,{email:"owner@example.test",options:{shouldCreateUser:false,emailRedirectTo:"https://owner.example.test/content"}});
});

it('restores and refreshes a persisted SDK session after a fresh client, then removes it on local sign-out', async () => {
  const { createSupabaseOwnerSession } = await import('./ownerSessionClient.ts');
  const values = new Map<string,string>();
  const key='sb-fixture-auth-token';
  const user={id:'11111111-1111-4111-8111-111111111111',email:'owner@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-30T00:00:00Z'};
  values.set(key,JSON.stringify({access_token:'expired-session',refresh_token:'fixture-refresh',expires_at:1,expires_in:3600,token_type:'bearer',user}));
  let refreshes=0;
  const storage={getItem:async(name:string)=>values.get(name) ?? null,setItem:async(name:string,value:string)=>{values.set(name,value);},removeItem:async(name:string)=>{values.delete(name);}};
  const fakeFetch:typeof fetch=async(input,init)=>{
    const url=String(input);
    if(url.includes('/token?grant_type=refresh_token')) {
      refreshes++;assert.deepEqual(JSON.parse(String(init?.body)),{refresh_token:'fixture-refresh'});
      return new Response(JSON.stringify({access_token:'restored-session',refresh_token:'rotated-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}),{status:200,headers:{'Content-Type':'application/json'}});
    }
    if(url.includes('/logout'))return new Response(null,{status:204});
    throw new Error(`Unexpected auth request: ${url}`);
  };
  const options={supabaseUrl:'https://fixture.supabase.co',anonKey:'public-test-key',storage,detectSessionInUrl:false,fetch:fakeFetch};
  const first=createSupabaseOwnerSession(options);
  assert.equal((await first.restore())?.user.email,'owner@example.test');
  assert.equal(await first.getAccessToken(),'restored-session');
  assert.equal(refreshes,1);
  const second=createSupabaseOwnerSession(options);
  assert.equal(await second.getAccessToken(),'restored-session');
  assert.equal(refreshes,1);
  await second.signOut();
  assert.equal(values.get(key),undefined);
  await assert.rejects(second.getAccessToken(),/Sign in/);
});
