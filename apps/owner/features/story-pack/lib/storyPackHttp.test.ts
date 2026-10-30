import assert from "node:assert/strict";
import { createServer } from "node:http";
import { it } from "node:test";
import { createHttpStoryPackClient } from "../services/storyPackHttpClient.ts";
import { createStoryPackService } from "../services/storyPackService.ts";

it("round-trips three slides and selected media through HTTP across new clients, then fails a revoked handoff", async () => {
  const jobId = "11111111-1111-4111-8111-111111111111";
  const mediaIds = ["22222222-2222-4222-8222-222222222222", "33333333-3333-4333-8333-333333333333"];
  const source = {id:jobId,businessName:"Fixture Plumbing",jobTitle:"Leak repair",state:"done",shareConsent:"yes",isDemo:false,
    assets:mediaIds.map((id,index)=>({id,role:index===0?"before":"after",revision:(index===0?'a':'b').repeat(64),label:id,imageUrl:`https://example.test/${id}.png`}))};
  let saved:any = null;
  let revoked=false;
  let handoffs=0;
  let reviews=0;
  let authCount=0;
  const server=createServer(async(req,res)=>{
    assert.equal(req.headers.authorization,"Bearer fixture-session");
    authCount++;
    const chunks:Buffer[]=[];
    for await (const chunk of req) chunks.push(chunk);
    const body=chunks.length?JSON.parse(Buffer.concat(chunks).toString()):{};
    const path=req.url!;
    let data:unknown;
    if(path.endsWith("/sources")) data=revoked?[]:[source];
    else if(path.endsWith("/photo-jobs")) data=[];
    else if(path.endsWith("/drafts") && req.method==="GET") data=saved?[saved]:[];
    else if(path.endsWith("/drafts") && req.method==="POST") {
      saved={...body,id:"44444444-4444-4444-8444-444444444444",source:"story_pack",status:"draft",scheduledAt:null,reviewedAt:null,publishedAt:null,canHandoff:false,createdAt:"2026-10-30T00:00:00Z",updatedAt:"2026-10-30T00:00:00Z"};data=saved;
    } else if(req.method==="PATCH") { saved={...saved,...body};data=saved; }
    else if(path.endsWith("/review")) { reviews++;assert.equal(body.approve,true);assert.equal(body.expectedUpdatedAt,saved.updatedAt);assert.deepEqual(body.expectedMedia,source.assets.map(({id,role,revision})=>({id,role,revision})));saved={...saved,status:"approved",canHandoff:true,reviewedAt:"2026-10-30T00:01:00Z"};data=saved; }
    else if(path.endsWith("/handoff")) { handoffs++;if(revoked){res.writeHead(409,{"Content-Type":"application/json"});res.end(JSON.stringify({error:"source unavailable"}));return;}data={draft:saved,source}; }
    else {res.writeHead(404);res.end();return;}
    res.writeHead(200,{"Content-Type":"application/json"});res.end(JSON.stringify({data}));
  });
  await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));
  try {
    const address=server.address();assert.ok(address && typeof address!=="string");
    const options={apiUrl:`http://127.0.0.1:${address.port}`,getAccessToken:async()=>"fixture-session"};
    const first=createStoryPackService(createHttpStoryPackClient(options));
    const pack=await first.createFromJob(jobId);
    const slides=[{title:"Before",body:"A leak was reported."},{title:"Work",body:"Repair complete."},{title:"After",body:"Contact our team."}];
    await first.updateDraft(pack.id,{caption:"Owner-written fixture copy.",slides,platforms:{facebook:false,instagram:true}});
    const reloaded=createStoryPackService(createHttpStoryPackClient(options));
    const persisted=(await reloaded.listPacks())[0];
    assert.deepEqual(persisted.slides,slides);assert.deepEqual(persisted.sourceMediaIds,mediaIds);assert.equal(persisted.caption,"Owner-written fixture copy.");
    await reloaded.approve(pack.id,{expectedUpdatedAt:persisted.updatedAt,expectedMedia:source.assets.map(asset=>({id:asset.id,role:asset.role as "before"|"after",revision:asset.revision}))});assert.equal(reviews,1);
    const ready=await reloaded.prepareHandoff(pack.id);assert.equal(ready.pack.status,"approved");assert.deepEqual(ready.source.assets.map(a=>a.id),mediaIds);
    await reloaded.prepareHandoff(pack.id);assert.equal(handoffs,2);
    revoked=true;
    await assert.rejects(reloaded.prepareHandoff(pack.id));
    assert.equal(handoffs,3);
    saved={...saved,slides:null};
    assert.deepEqual((await reloaded.listPacks())[0].slides,[],"Legacy missing slides must remain visibly missing");
    assert.ok(authCount>=10);
  } finally { await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve())); }
});

it('never PATCHes a display-only fallback job title into a null stored title', async () => {
  const dto = {
    id:'44444444-4444-4444-8444-444444444444',source:'story_pack',sourceJobId:'11111111-1111-4111-8111-111111111111',
    sourceMediaIds:['22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'],
    title:null,caption:'Owner caption',slides:[{title:'Before',body:'A'},{title:'Work',body:'B'},{title:'After',body:'C'}],
    platforms:['instagram'],status:'draft',scheduledAt:null,reviewedAt:null,publishedAt:null,canHandoff:false,
    createdAt:'2026-10-30T00:00:00Z',updatedAt:'2026-10-30T00:00:00Z',
  };
  let patch: Record<string,unknown>|undefined;
  const client=createHttpStoryPackClient({apiUrl:'https://example.test',getAccessToken:async()=>'fixture',fetch:async(_url,options)=>{
    if(options?.method==='PATCH') patch=JSON.parse(String(options.body));
    return new Response(JSON.stringify({data:options?.method==='PATCH'?dto:[dto]}),{status:200});
  }});
  const pack=(await client.listPacks())[0];
  assert.ok(pack.jobTitle);
  await client.update({...pack,caption:'Changed caption'});
  assert.equal(Object.hasOwn(patch!,'title'),false);
});
