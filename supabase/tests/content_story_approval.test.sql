-- Synthetic Story copy and exact-photo approval regressions, rolled back.
\set ON_ERROR_STOP 1
\set mario '{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}'
begin;
update public.jobs set state = 'done' where id = '80000000-0000-4000-8000-000000000001';
insert into public.media (id, conversation_id, job_id, kind, role, story_role, storage_path, mime_type)
values
 ('60000000-0000-4000-8000-000000000051', '40000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', 'image', 'before_photo', 'before', 'conversations/40000000-0000-4000-8000-000000000001/slides-before.webp', 'image/webp'),
 ('60000000-0000-4000-8000-000000000052', '40000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', 'image', 'after_photo', 'after', 'conversations/40000000-0000-4000-8000-000000000001/slides-after.webp', 'image/webp'),
 ('60000000-0000-4000-8000-000000000053', '40000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', 'image', 'after_photo', 'after', 'conversations/40000000-0000-4000-8000-000000000001/slides-other.webp', 'image/webp');
insert into public.consents (conversation_id, kind, granted, source_message_id, at)
values ('40000000-0000-4000-8000-000000000001', 'photos_for_marketing', true, null, '2099-02-01 00:00:00+00');
set local role authenticated;
set local request.jwt.claims to :'mario';

insert into public.content_drafts (tenant_id, source, source_job_id, source_media_ids, title, caption, platforms)
values ('10000000-0000-4000-8000-000000000001', 'story_pack', '80000000-0000-4000-8000-000000000001',
 array['60000000-0000-4000-8000-000000000051'::uuid, '60000000-0000-4000-8000-000000000052'::uuid],
 'Slide persistence fixture', 'A completed repair.', array[]::public.social_platform[]);


\echo '# exact displayed version and media roles are required at approval'
do $$
declare d public.content_drafts; snapshot jsonb;
begin
  update public.content_drafts set
    slides = '[{"title":"Before","body":"Leak"},{"title":"After","body":"Repaired"},{"title":"Contact","body":"Message us"}]',
    platforms = array['instagram']::public.social_platform[] where title = 'Slide persistence fixture';
  select * into d from public.content_drafts where title = 'Slide persistence fixture';
  snapshot := private.story_pack_media_snapshot(d.source_job_id, d.source_media_ids);
  begin
    perform public.review_content_draft(d.id, true);
    raise exception 'legacy two-argument RPC bypassed Story Pack approval snapshot';
  exception when check_violation then null; end;
  begin
    perform public.review_content_draft(d.id, true, d.updated_at - interval '1 second', snapshot);
    raise exception 'stale copy version was approved';
  exception when sqlstate 'PT409' then null; end;
  begin
    perform public.review_content_draft(d.id, true, d.updated_at,
      jsonb_set(jsonb_set(snapshot, '{0,role}', '"after"'), '{1,role}', '"before"'));
    raise exception 'unseen photo role change was approved';
  exception when sqlstate 'PT409' then null; end;
  begin
    update public.content_drafts set scheduled_at = now() + interval '1 day' where id = d.id;
    raise exception 'Story Pack scheduling was allowed';
  exception when check_violation then null; end;
  d := public.review_content_draft(d.id, true, d.updated_at, snapshot);
  assert d.approved_media = snapshot, 'approval did not persist exact media identity';
end $$;

\echo '# older T6 sources retain owner scheduling and two-argument approval'
reset role;
insert into public.content_drafts (id, tenant_id, source, source_job_id, caption, platforms)
values ('d0000000-0000-4000-8000-000000000099', '10000000-0000-4000-8000-000000000001', 'job',
  '80000000-0000-4000-8000-000000000001', 'Legacy marketing fixture', array['instagram']::public.social_platform[]);
set local role authenticated;
do $$
declare d public.content_drafts;
begin
  update public.content_drafts set scheduled_at = now() + interval '1 day'
    where id = 'd0000000-0000-4000-8000-000000000099';
  d := public.review_content_draft('d0000000-0000-4000-8000-000000000099', true);
  assert d.status = 'approved' and d.scheduled_at is not null, 'legacy scheduling/review regressed';
end $$;
reset role;
do $$ begin
  update public.content_drafts set status = 'published', published_at = now()
    where id = 'd0000000-0000-4000-8000-000000000099';
  begin
    update public.content_drafts set status = 'published', published_at = now()
      where title = 'Slide persistence fixture';
    raise exception 'Story Pack publishing was allowed';
  exception when check_violation then null; end;
end $$;
rollback;
