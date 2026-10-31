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

\echo '# incomplete copy/platform selection can save, but cannot approve'
do $$
declare d public.content_drafts;
  copy jsonb := '[{"title":"Before","body":"A leak."},{"title":"After","body":"A completed repair."},{"title":"Message us","body":"Ask about your repair."}]';
  invalid jsonb;
begin
  select * into d from public.content_drafts where title = 'Slide persistence fixture';
  assert d.slides is null and cardinality(d.platforms) = 0, 'draft must preserve incomplete state';
  begin
    perform public.review_content_draft(d.id, true, d.updated_at, private.story_pack_media_snapshot(d.source_job_id, d.source_media_ids));
    raise exception 'incomplete Story Pack was approved';
  exception when check_violation then null;
  end;
  update public.content_drafts set platforms = array['instagram']::public.social_platform[] where id = d.id;
  begin
    perform public.review_content_draft(d.id, true, d.updated_at, private.story_pack_media_snapshot(d.source_job_id, d.source_media_ids));
    raise exception 'Story Pack without slides was approved';
  exception when check_violation then null;
  end;
  foreach invalid in array array[
    '[]'::jsonb,
    '[{"title":"Only one","body":"Incomplete"}]'::jsonb,
    jsonb_set(copy, '{0,title}', to_jsonb(repeat('x', 61))),
    jsonb_set(copy, '{1,body}', to_jsonb(repeat('x', 281))),
    jsonb_set(copy, '{0,title}', 'null'::jsonb),
    jsonb_set(copy, '{0,extra}', 'true'::jsonb)
  ] loop
    begin
      update public.content_drafts set slides = invalid where id = d.id;
      raise exception 'invalid slide copy was saved: %', invalid;
    exception when check_violation then null;
    end;
  end loop;
  update public.content_drafts set slides = copy, platforms = array[]::public.social_platform[] where id = d.id;
  assert (select slides from public.content_drafts where id = d.id) = copy, 'slide JSON was not persisted';
  begin
    perform public.review_content_draft(d.id, true, d.updated_at, private.story_pack_media_snapshot(d.source_job_id, d.source_media_ids));
    raise exception 'Story Pack without a platform was approved';
  exception when check_violation then null;
  end;
  update public.content_drafts set platforms = array['instagram']::public.social_platform[] where id = d.id;
end $$;

\echo '# replacing selected after B with after C must not validate the selected pair'
reset role;
update public.media set story_role = 'before' where id = '60000000-0000-4000-8000-000000000052';
set local role authenticated;
do $$
declare draft_id uuid;
begin
  assert jsonb_array_length(public.owner_content_sources(100)) = 1, 'replacement after photo should keep the job eligible';
  select id into draft_id from public.content_drafts where title = 'Slide persistence fixture';
  begin
    perform public.review_content_draft(draft_id, true, (select updated_at from public.content_drafts where id = draft_id),
      (select private.story_pack_media_snapshot(source_job_id, source_media_ids) from public.content_drafts where id = draft_id));
    raise exception 'reclassified selected after photo was approved';
  exception when check_violation then null;
  end;
end $$;
reset role;
update public.media set job_id = null where id = '60000000-0000-4000-8000-000000000052';
set local role authenticated;
do $$
declare draft_id uuid;
begin
  select id into draft_id from public.content_drafts where title = 'Slide persistence fixture';
  begin
    perform public.review_content_draft(draft_id, true, (select updated_at from public.content_drafts where id = draft_id),
      (select private.story_pack_media_snapshot(source_job_id, source_media_ids) from public.content_drafts where id = draft_id));
    raise exception 'unassigned selected after photo was approved';
  exception when check_violation then null;
  end;
end $$;
reset role;
update public.media set job_id = '80000000-0000-4000-8000-000000000001', story_role = 'after'
where id = '60000000-0000-4000-8000-000000000052';
set local role authenticated;
do $$
declare d public.content_drafts;
begin
  select * into d from public.content_drafts where title = 'Slide persistence fixture';
  d := public.review_content_draft(d.id, true, d.updated_at, private.story_pack_media_snapshot(d.source_job_id, d.source_media_ids));
  assert d.status = 'approved', 'complete current Story Pack must approve';
  assert jsonb_array_length(d.slides) = 3, 'approval lost persisted copy';
end $$;

\echo '# the targeted source lookup is independent of the 100 newest jobs'
reset role;
do $$
declare job_id uuid;
begin
  for i in 1..100 loop
    job_id := gen_random_uuid();
    insert into public.jobs (id, tenant_id, conversation_id, handoff_id, title, state, updated_at)
    values (job_id, '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001',
      '50000000-0000-4000-8000-000000000001', 'Newer synthetic job ' || i, 'done', '2099-01-01');
    insert into public.media (conversation_id, job_id, kind, role, story_role, storage_path, mime_type)
    values ('40000000-0000-4000-8000-000000000001', job_id, 'image', 'before_photo', 'before', 'conversations/40000000-0000-4000-8000-000000000001/' || job_id || '/before.webp', 'image/webp'),
      ('40000000-0000-4000-8000-000000000001', job_id, 'image', 'after_photo', 'after', 'conversations/40000000-0000-4000-8000-000000000001/' || job_id || '/after.webp', 'image/webp');
  end loop;
end $$;
set local role authenticated;
do $$
declare sources jsonb;
begin
  sources := public.owner_content_sources(100);
  assert jsonb_array_length(sources) = 100, 'picker should contain 100 newer sources';
  assert not exists (select 1 from jsonb_array_elements(sources) x where x ->> 'id' = '80000000-0000-4000-8000-000000000001'), 'fixture must be outside picker';
  sources := public.owner_content_sources(100, array['80000000-0000-4000-8000-000000000001'::uuid]);
  assert jsonb_array_length(sources) = 1, 'targeted eligible job was incorrectly hidden by picker limit';
end $$;
rollback;
