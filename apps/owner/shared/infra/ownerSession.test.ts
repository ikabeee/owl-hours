// Spec: odd/tasks/crystal-pr-handoff-fixes.md, T4, S1 (email OTP through the shared session).
import assert from 'node:assert/strict';
import { it } from 'node:test';
import { createOwnerSessionService, type OwnerAuthPort } from './ownerSessionService.ts';

const noSession = async () => ({ data: { session: null }, error: null });

function authPort(overrides: Partial<OwnerAuthPort>): OwnerAuthPort {
  return {
    getSession: noSession,
    refreshSession: noSession,
    signInWithOtp: async () => ({ error: null }),
    verifyOtp: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    ...overrides,
  };
}

it('refreshes an expired restored session before issuing an API token', async () => {
  let refreshed = 0;
  const session = createOwnerSessionService(authPort({
    getSession: async () => ({ data:{session:{access_token:'expired',expires_at:1,user:{phone:'15550142290'}}},error:null }),
    refreshSession: async () => { refreshed++; return {data:{session:{access_token:'fresh',expires_at:9999999999,user:{phone:'15550142290'}}},error:null}; },
  }), () => 2000);
  assert.equal(await session.getAccessToken(),'fresh');
  assert.equal(refreshed,1);
});

it('fails closed if refresh fails, and never returns the expired token', async () => {
  const session = createOwnerSessionService(authPort({
    getSession: async () => ({data:{session:{access_token:'expired',expires_at:1,user:{}}},error:null}),
    refreshSession: async () => ({data:{session:null},error:new Error('expired refresh token')}),
  }), () => 2000);
  await assert.rejects(session.getAccessToken(),/Sign in/);
});

it('S1 sends the code with Supabase email OTP, creating the owner on sign-up', async () => {
  let request: unknown;
  const session = createOwnerSessionService(authPort({
    signInWithOtp: async (input) => { request = input; return { error: null }; },
  }));

  assert.equal(await session.sendCode(' Daniel@Example.COM '), true);
  assert.deepEqual(request, { email: 'daniel@example.com', options: { shouldCreateUser: true } });
});

it('S1 reports a rejected email send as false', async () => {
  const session = createOwnerSessionService(authPort({
    signInWithOtp: async () => ({ error: new Error('email provider down') }),
  }));

  assert.equal(await session.sendCode('daniel@example.com'), false);
});

it('S1 verifies the emailed code with verifyOtp type email', async () => {
  let request: unknown;
  const session = createOwnerSessionService(authPort({
    verifyOtp: async (input) => { request = input; return { error: null }; },
  }));

  assert.equal(await session.verifyCode('Daniel@Example.COM', '482910'), true);
  assert.deepEqual(request, { email: 'daniel@example.com', token: '482910', type: 'email' });
});

it('S1 reports a code Supabase rejects as false', async () => {
  const session = createOwnerSessionService(authPort({
    verifyOtp: async () => ({ error: new Error('Token has expired or is invalid') }),
  }));

  assert.equal(await session.verifyCode('daniel@example.com', '000000'), false);
});

it('restores and refreshes a persisted SDK session after a fresh client, then removes it on local sign-out', async () => {
  const { createSupabaseOwnerSession } = await import('./ownerSessionClient.ts');
  const values = new Map<string,string>();
  const key='sb-fixture-auth-token';
  const user={id:'11111111-1111-4111-8111-111111111111',phone:'15550142290',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-30T00:00:00Z'};
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
  assert.equal((await first.restore())?.user.phone,'15550142290');
  assert.equal(await first.getAccessToken(),'restored-session');
  assert.equal(refreshes,1);
  const second=createSupabaseOwnerSession(options);
  assert.equal(await second.getAccessToken(),'restored-session');
  assert.equal(refreshes,1);
  await second.signOut();
  assert.equal(values.get(key),undefined);
  await assert.rejects(second.getAccessToken(),/Sign in/);
});

it('S1 sends and verifies the emailed code through the SDK and stores the session in the given storage', async () => {
  const { createSupabaseOwnerSession } = await import('./ownerSessionClient.ts');
  const values = new Map<string,string>();
  const storage={getItem:async(name:string)=>values.get(name) ?? null,setItem:async(name:string,value:string)=>{values.set(name,value);},removeItem:async(name:string)=>{values.delete(name);}};
  const user={id:'22222222-2222-4222-8222-222222222222',email:'daniel@northside-plumbing.example',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-30T00:00:00Z'};
  const bodies: Record<string, Record<string, unknown>> = {};
  const fakeFetch:typeof fetch=async(input,init)=>{
    const url=String(input);
    if(url.endsWith('/auth/v1/otp')) {
      bodies.otp=JSON.parse(String(init?.body));
      return new Response(JSON.stringify({}),{status:200,headers:{'Content-Type':'application/json'}});
    }
    if(url.endsWith('/auth/v1/verify')) {
      bodies.verify=JSON.parse(String(init?.body));
      return new Response(JSON.stringify({access_token:'email-session',refresh_token:'email-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}),{status:200,headers:{'Content-Type':'application/json'}});
    }
    throw new Error(`Unexpected auth request: ${url}`);
  };
  const session=createSupabaseOwnerSession({supabaseUrl:'https://fixture.supabase.co',anonKey:'public-test-key',storage,detectSessionInUrl:false,autoRefreshToken:false,fetch:fakeFetch});

  assert.equal(await session.sendCode(' Daniel@Northside-Plumbing.Example '),true);
  assert.equal(await session.verifyCode('Daniel@Northside-Plumbing.Example','482910'),true);

  assert.deepEqual(fields(bodies.otp, ['email', 'create_user']), { email:'daniel@northside-plumbing.example', create_user:true });
  assert.deepEqual(fields(bodies.verify, ['email', 'token', 'type']), { email:'daniel@northside-plumbing.example', token:'482910', type:'email' });
  assert.equal(await session.getAccessToken(),'email-session');
  assert.match(values.get('sb-fixture-auth-token') ?? '',/email-session/);
});

function fields(body: Record<string, unknown> | undefined, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(keys.map((key) => [key, body?.[key]]));
}
