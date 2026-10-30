-- Owner photo attribution uses stored customer consent and explicit selections.
\set ON_ERROR_STOP 1
\set mario '{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}'
\set eastside '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}'
begin;
update public.jobs set state = 'done' where id = '80000000-0000-4000-8000-000000000001';
insert into public.jobs (id, tenant_id, conversation_id, handoff_id, title, state)
values ('80000000-0000-4000-8000-000000000088', '10000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Another synthetic job', 'done');
insert into public.media (id, conversation_id, job_id, kind, role, storage_path, mime_type)
values
 ('60000000-0000-4000-8000-000000000081','40000000-0000-4000-8000-000000000001',null,'image','evidence','conversations/40000000-0000-4000-8000-000000000001/synthetic-before.png','image/png'),
 ('60000000-0000-4000-8000-000000000082','40000000-0000-4000-8000-000000000001',null,'image','evidence','conversations/40000000-0000-4000-8000-000000000001/synthetic-after.png','image/png'),
 ('60000000-0000-4000-8000-000000000083','40000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000088','image','after_photo','conversations/40000000-0000-4000-8000-000000000001/other-job.png','image/png'),
 ('60000000-0000-4000-8000-000000000084','40000000-0000-4000-8000-000000000002',null,'image','evidence','conversations/40000000-0000-4000-8000-000000000002/foreign.png','image/png');

set local role authenticated;
set local request.jwt.claims to :'mario';
do $$ declare item jsonb; begin
 select value into item from jsonb_array_elements(public.owner_content_photo_jobs(100)) where value->>'id'='80000000-0000-4000-8000-000000000001';
 assert item->>'shareConsent'='not_asked', 'missing consent must not be assumed';
 assert item->>'assignmentBlockedReason'='consent_required';
 assert jsonb_array_length(item->'assets')=0, 'missing consent must expose no media paths';
 begin
  perform public.owner_assign_content_photos('80000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000081','60000000-0000-4000-8000-000000000082');
  raise exception 'assigned photos without consent';
 exception when check_violation then null; end;
end $$;
reset role;
insert into public.consents(conversation_id,kind,granted,at)
values ('40000000-0000-4000-8000-000000000001','photos_for_marketing',true,'2099-01-01');

set local role authenticated;
set local request.jwt.claims to :'eastside';
do $$ begin
 assert jsonb_array_length(public.owner_content_photo_jobs(100))=0, 'another tenant sees no jobs';
 begin
  perform public.owner_assign_content_photos('80000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000081','60000000-0000-4000-8000-000000000082');
  raise exception 'cross tenant assignment succeeded';
 exception when no_data_found then null; end;
end $$;
set local request.jwt.claims to :'mario';
do $$ declare item jsonb; begin
 select value into item from jsonb_array_elements(public.owner_content_photo_jobs(100)) where value->>'id'='80000000-0000-4000-8000-000000000001';
 assert jsonb_array_length(item->'assets')=2, 'only this conversation unassigned photos are candidates';
 begin
  perform public.owner_assign_content_photos('80000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000081','60000000-0000-4000-8000-000000000083');
  raise exception 'stole media from another job';
 exception when check_violation then null; end;
 begin
  perform public.owner_assign_content_photos('80000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000081','60000000-0000-4000-8000-000000000084');
  raise exception 'attached foreign conversation media';
 exception when check_violation then null; end;
 begin
  perform public.owner_assign_content_photos('80000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000081','60000000-0000-4000-8000-000000000081');
  raise exception 'same image used before and after';
 exception when check_violation then null; end;
 perform public.owner_assign_content_photos('80000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000081','60000000-0000-4000-8000-000000000082');
 assert (select job_id from public.media where id='60000000-0000-4000-8000-000000000081')='80000000-0000-4000-8000-000000000001'::uuid;
 assert (select job_assigned_by from public.media where id='60000000-0000-4000-8000-000000000081')=(select auth.uid()), 'assignment must identify owner';
 assert (select job_assigned_at from public.media where id='60000000-0000-4000-8000-000000000082') is not null;
 assert (select count(*) from public.consents where conversation_id='40000000-0000-4000-8000-000000000001' and kind='photos_for_marketing')=1, 'classification must not create or alter customer consent';
 select value into item from jsonb_array_elements(public.owner_content_sources(100)) where value->>'id'='80000000-0000-4000-8000-000000000001';
 assert jsonb_array_length(item->'assets')=2, 'explicit selection must feed Story Pack source';
 assert item->'assets'->0->>'role'='before';
 assert item->'assets'->1->>'role'='after';
end $$;
-- A changed explicit pair replaces the source pair without releasing old
-- photos for a different job to claim.
reset role;
insert into public.media (id, conversation_id, kind, role, storage_path, mime_type)
values
 ('60000000-0000-4000-8000-000000000085','40000000-0000-4000-8000-000000000001','image','evidence','conversations/40000000-0000-4000-8000-000000000001/replacement-before.png','image/png'),
 ('60000000-0000-4000-8000-000000000086','40000000-0000-4000-8000-000000000001','image','evidence','conversations/40000000-0000-4000-8000-000000000001/replacement-after.png','image/png');
set local role authenticated;
do $$ declare item jsonb; begin
 perform public.owner_assign_content_photos('80000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000085','60000000-0000-4000-8000-000000000086');
 select value into item from jsonb_array_elements(public.owner_content_sources(100)) where value->>'id'='80000000-0000-4000-8000-000000000001';
 assert jsonb_array_length(item->'assets')=2, 'replacement must leave exactly the selected source pair';
 assert item->'assets'->0->>'id'='60000000-0000-4000-8000-000000000085';
 assert item->'assets'->1->>'id'='60000000-0000-4000-8000-000000000086';
 assert (select job_id from public.media where id='60000000-0000-4000-8000-000000000081')='80000000-0000-4000-8000-000000000001'::uuid, 'replacement must retain old photo job ownership';
 assert (select role from public.media where id='60000000-0000-4000-8000-000000000081')='evidence', 'old customer evidence role must be preserved';
 assert (select story_role from public.media where id='60000000-0000-4000-8000-000000000081') is null;
end $$;
reset role;
insert into public.consents(conversation_id,kind,granted,at)
values ('40000000-0000-4000-8000-000000000001','photos_for_marketing',false,'2099-01-02');
set local role authenticated;
do $$ begin
 assert jsonb_array_length(public.owner_content_sources(100))=0, 'revocation must remove source';
 begin
  perform public.owner_assign_content_photos('80000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000081','60000000-0000-4000-8000-000000000082');
  raise exception 'assignment allowed revoked consent';
 exception when check_violation then null; end;
end $$;
reset role;
insert into public.consents(conversation_id,kind,granted,at)
values ('40000000-0000-4000-8000-000000000001','photos_for_marketing',true,'2099-01-03');
insert into public.handoffs(id,conversation_id,tenant_id,status,urgency,attempt,offered_at,expires_at,resolved_at)
values ('50000000-0000-4000-8000-000000000089','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','closed','today',2,now(),now()+interval '1 hour',now());
set local role authenticated;
do $$ declare item jsonb; begin
 select value into item from jsonb_array_elements(public.owner_content_photo_jobs(100)) where value->>'id'='80000000-0000-4000-8000-000000000001';
 assert item->>'assignmentBlockedReason'='ambiguous_conversation', 'cross-tenant conversation history must block role inference';
 assert jsonb_array_length(item->'assets')=0;
 begin
  perform public.owner_assign_content_photos('80000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000081','60000000-0000-4000-8000-000000000082');
  raise exception 'assigned ambiguous conversation photos';
 exception when check_violation then null; end;
end $$;
rollback;
