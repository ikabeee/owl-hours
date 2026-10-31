-- Story Pack logical delete (Spec S9):
-- Deleting a job or conversation that has a Story Pack draft must not abort
-- and must never physically delete the draft row. The row stays with deleted_at set.
\set ON_ERROR_STOP 1
\set mario '{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}'

\echo '# S9: deleting the source job marks Story Pack draft deleted_at and sets source_job_id null'
begin;
update public.jobs set state = 'done' where id = '80000000-0000-4000-8000-000000000001';
insert into public.media (id, conversation_id, job_id, kind, role, story_role, storage_path, mime_type)
values
  ('60000000-0000-4000-8000-000000000081', '40000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001',
   'image', 'before_photo', 'before', 'conversations/40000000-0000-4000-8000-000000000001/ld-before.webp', 'image/webp'),
  ('60000000-0000-4000-8000-000000000082', '40000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001',
   'image', 'after_photo', 'after', 'conversations/40000000-0000-4000-8000-000000000001/ld-after.webp', 'image/webp');
insert into public.consents (conversation_id, kind, granted, source_message_id, at)
values ('40000000-0000-4000-8000-000000000001', 'photos_for_marketing', true, null, '2099-01-01 00:00:00+00');

-- Fixture rows are created as the migration owner (the column grant excludes id),
-- with Mario's claims so the owner-scoped eligibility check can see the job.
set local request.jwt.claims to :'mario';
insert into public.content_drafts (id, tenant_id, source, source_job_id, source_media_ids, title, caption, platforms)
values ('d0000000-0000-4000-8000-000000000081', '10000000-0000-4000-8000-000000000001',
        'story_pack', '80000000-0000-4000-8000-000000000001',
        array['60000000-0000-4000-8000-000000000081'::uuid, '60000000-0000-4000-8000-000000000082'::uuid],
        'Logical delete job fixture', 'A sample story.', array['instagram']::public.social_platform[]);

delete from public.jobs where id = '80000000-0000-4000-8000-000000000001';

do $$
declare
  d record;
begin
  select * into d from public.content_drafts where id = 'd0000000-0000-4000-8000-000000000081';
  assert d.id is not null, 'Story Pack draft must survive source job deletion';
  assert d.source_job_id is null, 'draft source_job_id must be null after job deletion';
  assert d.deleted_at is not null, 'draft deleted_at must be set after source job deletion';
end $$;
rollback;

\echo '# S9: inserting a live story_pack draft with null source_job_id still raises check_violation'
begin;
set local role authenticated;
set local request.jwt.claims to :'mario';
do $$ begin
  begin
    insert into public.content_drafts (tenant_id, source, source_job_id, source_media_ids, title, caption, platforms)
    values ('10000000-0000-4000-8000-000000000001', 'story_pack', null,
            array['60000000-0000-4000-8000-000000000011'::uuid, '60000000-0000-4000-8000-000000000012'::uuid],
            'Null job live insert', 'Should fail.', array['instagram']::public.social_platform[]);
    raise exception 'inserting live story_pack with null source_job_id succeeded';
  exception when check_violation then null;
  end;
end $$;
rollback;

\echo '# S9: deleting the conversation succeeds and leaves the Story Pack draft logically deleted'
begin;
update public.jobs set state = 'done' where id = '80000000-0000-4000-8000-000000000001';
insert into public.media (id, conversation_id, job_id, kind, role, story_role, storage_path, mime_type)
values
  ('60000000-0000-4000-8000-000000000083', '40000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001',
   'image', 'before_photo', 'before', 'conversations/40000000-0000-4000-8000-000000000001/conv-before.webp', 'image/webp'),
  ('60000000-0000-4000-8000-000000000084', '40000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001',
   'image', 'after_photo', 'after', 'conversations/40000000-0000-4000-8000-000000000001/conv-after.webp', 'image/webp');
insert into public.consents (conversation_id, kind, granted, source_message_id, at)
values ('40000000-0000-4000-8000-000000000001', 'photos_for_marketing', true, null, '2099-01-01 00:00:00+00');

-- Fixture rows are created as the migration owner (the column grant excludes id),
-- with Mario's claims so the owner-scoped eligibility check can see the job.
set local request.jwt.claims to :'mario';
insert into public.content_drafts (id, tenant_id, source, source_job_id, source_media_ids, title, caption, platforms)
values ('d0000000-0000-4000-8000-000000000082', '10000000-0000-4000-8000-000000000001',
        'story_pack', '80000000-0000-4000-8000-000000000001',
        array['60000000-0000-4000-8000-000000000083'::uuid, '60000000-0000-4000-8000-000000000084'::uuid],
        'Logical delete conv fixture', 'A sample story.', array['instagram']::public.social_platform[]);

delete from public.conversations where id = '40000000-0000-4000-8000-000000000001';

do $$
declare
  d record;
begin
  select * into d from public.content_drafts where id = 'd0000000-0000-4000-8000-000000000082';
  assert d.id is not null, 'Story Pack draft must survive conversation deletion cascade';
  assert d.source_job_id is null, 'draft source_job_id must be null after conversation deletion';
  assert d.deleted_at is not null, 'draft deleted_at must be set after conversation deletion';
end $$;
rollback;
