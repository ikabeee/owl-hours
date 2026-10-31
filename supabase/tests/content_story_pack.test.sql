-- Story Pack sources and drafts obey the owner boundary and current photo consent.
\set ON_ERROR_STOP 1
\set mario '{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}'
\set eastside '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}'

-- Synthetic jobs and media links exist only for this test file and are removed
-- at the end so later database suites see the original seed state.
update public.jobs set state = 'done' where id = '80000000-0000-4000-8000-000000000001';
insert into public.jobs (id, tenant_id, conversation_id, handoff_id, title, state)
values ('80000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001',
        '40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001',
        'Other repair (test fixture)', 'done');

insert into public.media (id, conversation_id, job_id, kind, role, story_role, storage_path, mime_type)
values
  ('60000000-0000-4000-8000-000000000011', '40000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', 'image', 'before_photo', 'before',
   'conversations/40000000-0000-4000-8000-000000000001/story-before.webp', 'image/webp'),
  ('60000000-0000-4000-8000-000000000012', '40000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', 'image', 'after_photo', 'after',
   'conversations/40000000-0000-4000-8000-000000000001/story-after.webp', 'image/webp'),
  ('60000000-0000-4000-8000-000000000013', '40000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', 'image', 'job_photo', null,
   'conversations/40000000-0000-4000-8000-000000000001/story-extra-after.webp', 'image/webp'),
  ('60000000-0000-4000-8000-000000000021', '40000000-0000-4000-8000-000000000002', null, 'image', 'before_photo', 'before',
   'conversations/40000000-0000-4000-8000-000000000002/story-before.webp', 'image/webp'),
  ('60000000-0000-4000-8000-000000000022', '40000000-0000-4000-8000-000000000002', null, 'image', 'after_photo', 'after',
   'conversations/40000000-0000-4000-8000-000000000002/story-after.webp', 'image/webp'),
  ('60000000-0000-4000-8000-000000000031', '40000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000003', 'image', 'after_photo', 'after',
   'conversations/40000000-0000-4000-8000-000000000001/other-job-after.webp', 'image/webp');

insert into public.consents (conversation_id, kind, granted, source_message_id, at)
values ('40000000-0000-4000-8000-000000000001', 'photos_for_marketing', true, null, '2099-01-01 00:00:00+00');

\echo '# source picker returns only done, consented before/after media for the signed-in owner tenant'
begin;
set local role authenticated;
set local request.jwt.claims to :'mario';
do $$
declare sources jsonb;
begin
  sources := public.owner_content_sources(50);
  assert jsonb_array_length(sources) = 1, 'Northside should see one eligible source';
  assert sources -> 0 ->> 'id' = '80000000-0000-4000-8000-000000000001', 'source job id was not Northside';
  assert sources -> 0 -> 'assets' -> 0 ->> 'role' = 'before', 'first source asset should be before';
  assert sources -> 0 -> 'assets' -> 1 ->> 'role' = 'after', 'second source asset should be after';
  assert sources -> 0 ->> 'customerName' is null, 'source picker must not return customer identity';
end $$;
rollback;

begin;
set local role authenticated;
set local request.jwt.claims to :'eastside';
do $$ begin
  assert jsonb_array_length(public.owner_content_sources(50)) = 0, 'Eastside must not see Northside sources';
end $$;
rollback;

\echo '# owner can create a draft from own current before/after photos only'
begin;
set local role authenticated;
set local request.jwt.claims to :'mario';
insert into public.content_drafts (tenant_id, source, source_job_id, source_media_ids, title, caption, platforms)
values ('10000000-0000-4000-8000-000000000001', 'story_pack', '80000000-0000-4000-8000-000000000001',
        array['60000000-0000-4000-8000-000000000011'::uuid, '60000000-0000-4000-8000-000000000012'::uuid],
        'Bathroom repair (test fixture)', 'A sample repair story.', array['instagram']::public.social_platform[]);
do $$ begin
  assert (select status from public.content_drafts where title = 'Bathroom repair (test fixture)') = 'draft', 'new Story Pack must start as a draft';
  assert (select count(*) from public.content_drafts where tenant_id = '10000000-0000-4000-8000-000000000002') = 0,
    'Northside must not read Eastside drafts';
end $$;
rollback;

\echo '# tenant id cannot be forged and insert cannot set scheduled or published asset fields'
begin;
set local role authenticated;
set local request.jwt.claims to :'mario';
do $$ begin
  begin
    insert into public.content_drafts (tenant_id, source, source_job_id, source_media_ids, title, caption, platforms)
    values ('10000000-0000-4000-8000-000000000002', 'story_pack', '80000000-0000-4000-8000-000000000001',
            array['60000000-0000-4000-8000-000000000021'::uuid, '60000000-0000-4000-8000-000000000022'::uuid],
            'Forged tenant', 'Should fail.', array['instagram']::public.social_platform[]);
    raise exception 'cross-tenant insert succeeded';
  exception when insufficient_privilege or check_violation then null;
  end;
  begin
    insert into public.content_drafts (tenant_id, source, source_job_id, source_media_ids, title, caption, platforms, scheduled_at)
    values ('10000000-0000-4000-8000-000000000001', 'story_pack', '80000000-0000-4000-8000-000000000001',
            array['60000000-0000-4000-8000-000000000011'::uuid, '60000000-0000-4000-8000-000000000012'::uuid],
            'Scheduled attempt', 'Should fail.', array['instagram']::public.social_platform[], now());
    raise exception 'scheduled_at insert succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

\echo '# mixed-job media and missing before/after pairs are rejected by the trigger'
begin;
set local role authenticated;
set local request.jwt.claims to :'mario';
do $$ begin
  begin
    insert into public.content_drafts (tenant_id, source, source_job_id, source_media_ids, title, caption, platforms)
    values ('10000000-0000-4000-8000-000000000001', 'story_pack', '80000000-0000-4000-8000-000000000001',
            array['60000000-0000-4000-8000-000000000011'::uuid, '60000000-0000-4000-8000-000000000031'::uuid],
            'Mixed media', 'Should fail.', array['instagram']::public.social_platform[]);
    raise exception 'mixed-job media succeeded';
  exception when check_violation then null;
  end;
  begin
    insert into public.content_drafts (tenant_id, source, source_job_id, source_media_ids, title, caption, platforms)
    values ('10000000-0000-4000-8000-000000000001', 'story_pack', '80000000-0000-4000-8000-000000000001',
            array['60000000-0000-4000-8000-000000000011'::uuid],
            'Missing after', 'Should fail.', array['instagram']::public.social_platform[]);
    raise exception 'one-sided photo selection succeeded';
  exception when check_violation then null;
  end;
  begin
    insert into public.content_drafts (tenant_id, source, source_job_id, source_media_ids, title, caption, platforms)
    values ('10000000-0000-4000-8000-000000000001', 'story_pack', '80000000-0000-4000-8000-000000000001',
            array['60000000-0000-4000-8000-000000000011'::uuid, '60000000-0000-4000-8000-000000000012'::uuid, '60000000-0000-4000-8000-000000000013'::uuid],
            'Three photos', 'Should fail.', array['instagram']::public.social_platform[]);
    raise exception 'three-photo selection succeeded';
  exception when check_violation then null;
  end;
  assert not private.story_pack_is_eligible(
    '80000000-0000-4000-8000-000000000001'::uuid,
    '10000000-0000-4000-8000-000000000001'::uuid,
    array['60000000-0000-4000-8000-000000000011'::uuid, '60000000-0000-4000-8000-000000000012'::uuid, '60000000-0000-4000-8000-000000000013'::uuid]
  ), 'story_pack_is_eligible must reject cardinality <> 2';
end $$;
rollback;

\echo '# approval rechecks latest consent; a revocation prevents approval'
begin;
set local role authenticated;
set local request.jwt.claims to :'mario';
insert into public.content_drafts (tenant_id, source, source_job_id, source_media_ids, title, caption, platforms)
values ('10000000-0000-4000-8000-000000000001', 'story_pack', '80000000-0000-4000-8000-000000000001',
        array['60000000-0000-4000-8000-000000000011'::uuid, '60000000-0000-4000-8000-000000000012'::uuid],
        'Revoke test', 'Should not be approved.', array['instagram']::public.social_platform[]);
reset role;
insert into public.consents (conversation_id, kind, granted, source_message_id, at)
values ('40000000-0000-4000-8000-000000000001', 'photos_for_marketing', false, null, '2099-01-01 00:01:00+00');
set local role authenticated;
do $$
declare draft_id uuid;
begin
  select id into draft_id from public.content_drafts where title = 'Revoke test';
  begin
    perform public.review_content_draft(draft_id, true, (select updated_at from public.content_drafts where id = draft_id),
      (select private.story_pack_media_snapshot(source_job_id, source_media_ids) from public.content_drafts where id = draft_id));
    raise exception 'approval succeeded after consent revocation';
  exception when check_violation then null;
  end;
end $$;
rollback;

-- Leave the shared seed ready for the unrelated SQL suites that follow.
delete from public.consents
where conversation_id = '40000000-0000-4000-8000-000000000001'
  and kind = 'photos_for_marketing'
  and at in ('2099-01-01 00:00:00+00', '2099-01-01 00:01:00+00');
delete from public.media where id in (
  '60000000-0000-4000-8000-000000000011', '60000000-0000-4000-8000-000000000012',
  '60000000-0000-4000-8000-000000000013',
  '60000000-0000-4000-8000-000000000021', '60000000-0000-4000-8000-000000000022',
  '60000000-0000-4000-8000-000000000031'
);
delete from public.jobs where id = '80000000-0000-4000-8000-000000000003';
update public.jobs set state = 'proposed' where id = '80000000-0000-4000-8000-000000000001';
