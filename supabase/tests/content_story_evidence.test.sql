-- Story photo choices must not rewrite the request evidence or job audit.
\set ON_ERROR_STOP 1
\set mario '{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}'
begin;
update public.jobs set state = 'done' where id = '80000000-0000-4000-8000-000000000001';
insert into public.media (id, conversation_id, job_id, kind, role, storage_path, mime_type, job_assigned_by, job_assigned_at)
values
 ('60000000-0000-4000-8000-000000000091','40000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001','image','evidence','conversations/40000000-0000-4000-8000-000000000001/evidence-a.webp','image/webp','20000000-0000-4000-8000-000000000002','2001-01-01'),
 ('60000000-0000-4000-8000-000000000092','40000000-0000-4000-8000-000000000001',null,'image','evidence','conversations/40000000-0000-4000-8000-000000000001/evidence-b.webp','image/webp',null,null),
 ('60000000-0000-4000-8000-000000000093','40000000-0000-4000-8000-000000000001',null,'image','evidence','conversations/40000000-0000-4000-8000-000000000001/evidence-c.webp','image/webp',null,null),
 ('60000000-0000-4000-8000-000000000094','40000000-0000-4000-8000-000000000001',null,'image','job_photo','conversations/40000000-0000-4000-8000-000000000001/job-d.webp','image/webp',null,null);
insert into public.consents(conversation_id, kind, granted, at)
values ('40000000-0000-4000-8000-000000000001','photos_for_marketing',true,'2099-02-01');
set local role authenticated;
set local request.jwt.claims to :'mario';
do $$
declare
  failures text[] := '{}';
  offer jsonb;
  source jsonb;
  ids uuid[] := array['60000000-0000-4000-8000-000000000091','60000000-0000-4000-8000-000000000092','60000000-0000-4000-8000-000000000093']::uuid[];
begin
  select value into offer from jsonb_array_elements(public.owner_offers('accepted', 100))
    where value->>'id' = '50000000-0000-4000-8000-000000000001';
  assert (select count(*) from jsonb_array_elements(offer->'media') x where (x->>'id')::uuid = any(ids)) = 3,
    'fixture must start with three visible customer evidence photos';
  perform public.owner_assign_content_photos('80000000-0000-4000-8000-000000000001', ids[1], ids[2]);
  if exists (select 1 from public.media where id = any(ids[1:2]) and role <> 'evidence') then
    failures := array_append(failures, 'assigning a pair rewrites customer evidence roles');
  end if;
  if (select job_assigned_at from public.media where id = ids[1]) <> '2001-01-01'::timestamptz then
    failures := array_append(failures, 'assigning a pair overwrites original job assignment time');
  end if;
  perform public.owner_assign_content_photos('80000000-0000-4000-8000-000000000001', ids[3], '60000000-0000-4000-8000-000000000094');
  select value into offer from jsonb_array_elements(public.owner_offers('accepted', 100))
    where value->>'id' = '50000000-0000-4000-8000-000000000001';
  if (select count(*) from jsonb_array_elements(offer->'media') x where (x->>'id')::uuid = any(ids)) <> 3 then
    failures := array_append(failures, 'replacing a Story pair removes customer photos from owner_offers');
  end if;
  if exists (select 1 from public.media where id = any(ids) and role <> 'evidence') then
    failures := array_append(failures, 'replacing a pair destroys the original evidence roles');
  end if;
  if (select role from public.media where id = '60000000-0000-4000-8000-000000000094') <> 'job_photo' then
    failures := array_append(failures, 'assigning a job photo rewrites its original role');
  end if;
  if (select job_assigned_at from public.media where id = ids[1]) <> '2001-01-01'::timestamptz
     or (select job_assigned_by from public.media where id = ids[1]) <> '20000000-0000-4000-8000-000000000002'::uuid then
    failures := array_append(failures, 'replacement overwrites original job assignment audit');
  end if;
  if exists (select 1 from public.media where id = any(ids) and job_id <> '80000000-0000-4000-8000-000000000001'::uuid) then
    failures := array_append(failures, 'replacement releases an already attributed photo from its job');
  end if;
  select value into source from jsonb_array_elements(public.owner_content_sources(100))
    where value->>'id' = '80000000-0000-4000-8000-000000000001';
  assert jsonb_array_length(source->'assets') = 2, 'replacement must select exactly two Story assets';
  assert source->'assets'->0->>'id' = ids[3]::text and source->'assets'->0->>'role' = 'before';
  assert source->'assets'->1->>'id' = '60000000-0000-4000-8000-000000000094' and source->'assets'->1->>'role' = 'after';
  assert cardinality(failures) = 0, array_to_string(failures, '; ');
end $$;
rollback;
