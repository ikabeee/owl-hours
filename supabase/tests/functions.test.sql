-- Directory matching, handoff timer and job transitions.
-- Demo night: Tuesday 2026-11-03 00:04 in Cancun (UTC-5) = 05:04Z.
\set ON_ERROR_STOP 1
\set mario '{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}'
\set eastside '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}'

\echo '# at night only businesses taking night jobs match, closest first'
begin;
set local role service_role;
do $$
declare names text; km text;
begin
  select string_agg(slug, ',' order by distance_km), string_agg(distance_km::text, ',' order by distance_km)
  into names, km
  from public.search_directory('plumbing', 21.1619, -86.8515, '2026-11-03T05:04:00Z');
  assert names = 'northside,eastside', 'night match was ' || coalesce(names, 'none');
  assert km = '1.2,2.4', 'distances were ' || coalesce(km, 'none');
end $$;
rollback;

\echo '# another option skips businesses already tried'
begin;
set local role service_role;
do $$ begin
  assert (select slug from public.search_directory('plumbing', 21.1619, -86.8515, '2026-11-03T05:04:00Z',
          array['10000000-0000-4000-8000-000000000001']::uuid[]) limit 1) = 'eastside', 'should skip Northside';
end $$;
rollback;

\echo '# in the daytime the closest open business wins'
begin;
set local role service_role;
do $$ begin
  assert (select slug from public.search_directory('plumbing', 21.1619, -86.8515, '2026-11-04T15:00:00Z') limit 1) = 'lagoon',
    'Lagoon is open and closest at 10 AM';
  assert (select count(*) from public.search_directory('electrical', 21.1619, -86.8515, '2026-11-04T15:00:00Z')) = 0,
    'no electricians in the seed';
  assert (select count(*) from public.search_directory('plumbing', 40.0, -3.0, '2026-11-04T15:00:00Z')) = 0,
    'nobody serves Madrid';
end $$;
rollback;

\echo '# a handoff gets 5 minutes when urgent and 30 otherwise'
begin;
set local role service_role;
do $$
declare h public.handoffs;
begin
  update public.handoffs set status = 'declined', resolved_at = now() where id = '50000000-0000-4000-8000-000000000002';
  h := public.create_handoff('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001');
  assert h.expires_at - h.offered_at = interval '30 minutes', 'Pedro is not urgent: 30 minutes';
  assert h.attempt = 2, 'second business is attempt 2';
  assert (select state from public.conversations where id = h.conversation_id) = 'offered', 'conversation offered';
  assert (select count(*) from public.handoff_events where handoff_id = h.id) = 1, 'offer is logged';
end $$;
rollback;

\echo '# a conversation has at most one open handoff'
begin;
set local role service_role;
do $$ begin
  begin
    perform public.create_handoff('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001');
    raise exception 'second open handoff was allowed';
  exception when unique_violation then null;
  end;
end $$;
rollback;

\echo '# the owner accepts in time'
begin;
set local role authenticated;
set local request.jwt.claims to :'eastside';
do $$
declare h public.handoffs;
begin
  h := public.accept_handoff('50000000-0000-4000-8000-000000000002');
  assert h.status = 'accepted', 'status was ' || h.status;
  assert (select state from public.conversations where id = h.conversation_id) = 'accepted', 'conversation accepted';
  assert (select count(*) from public.handoff_events where handoff_id = h.id and to_status = 'accepted') = 1, 'accept logged';
  begin
    perform public.accept_handoff('50000000-0000-4000-8000-000000000002');
    raise exception 'accepted twice';
  exception when sqlstate '22023' then null;
  end;
end $$;
rollback;

\echo '# an owner cannot accept another business''s handoff'
begin;
set local role authenticated;
set local request.jwt.claims to :'mario';
do $$ begin
  begin
    perform public.accept_handoff('50000000-0000-4000-8000-000000000002');
    raise exception 'Mario accepted Eastside''s handoff';
  exception when no_data_found then null;
  end;
end $$;
rollback;

\echo '# a late accept expires the offer instead'
begin;
update public.handoffs set offered_at = now() - interval '40 minutes', expires_at = now() - interval '10 minutes'
where id = '50000000-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claims to :'eastside';
do $$
declare h public.handoffs;
begin
  h := public.accept_handoff('50000000-0000-4000-8000-000000000002');
  assert h.status = 'expired', 'late accept should expire, got ' || h.status;
  assert (select count(*) from public.conversations where id = h.conversation_id) = 0,
    'an expired offer must not keep the conversation visible';
end $$;
reset role;
do $$ begin
  assert (select state from public.conversations where id = '40000000-0000-4000-8000-000000000002') = 'matched',
    'back to matching';
end $$;
rollback;

\echo '# the owner can decline'
begin;
set local role authenticated;
set local request.jwt.claims to :'eastside';
do $$
declare h public.handoffs;
begin
  h := public.decline_handoff('50000000-0000-4000-8000-000000000002', 'no technician free');
  assert h.status = 'declined', 'status was ' || h.status;
  assert (select active_handoff_id from public.conversations where id = h.conversation_id) is null, 'active handoff cleared';
end $$;
rollback;

\echo '# the expiry job closes only overdue offers'
begin;
update public.handoffs set offered_at = now() - interval '40 minutes', expires_at = now() - interval '10 minutes'
where id = '50000000-0000-4000-8000-000000000002';
set local role service_role;
do $$ begin
  assert (select count(*) from public.expire_handoffs()) = 1, 'one overdue offer';
  assert (select status from public.handoffs where id = '50000000-0000-4000-8000-000000000002') = 'expired', 'expired';
  assert (select status from public.handoffs where id = '50000000-0000-4000-8000-000000000001') = 'accepted', 'accepted untouched';
  assert (select count(*) from public.expire_handoffs()) = 0, 'second run is a no-op';
end $$;
rollback;

\echo '# owner job transitions follow the actor rules'
begin;
set local role authenticated;
set local request.jwt.claims to :'mario';
do $$
declare j public.jobs;
begin
  j := public.owner_transition_job('80000000-0000-4000-8000-000000000001', 'owner_confirmed', 'quote looks right');
  assert j.state = 'owner_confirmed', 'owner confirms';
  assert (select count(*) from public.job_events where job_id = j.id and to_state = 'owner_confirmed') = 1, 'logged';
  begin
    perform public.owner_transition_job(j.id, 'customer_approved', 'pretending to be Ana');
    raise exception 'owner approved on the customer''s behalf';
  exception when sqlstate '22023' then null;
  end;
  j := public.owner_transition_job(j.id, 'cancelled', 'customer fixed it');
  begin
    perform public.owner_transition_job(j.id, 'proposed', 'reopen');
    raise exception 'cancelled job moved';
  exception when sqlstate '22023' then null;
  end;
end $$;
rollback;

begin;
set local role authenticated;
set local request.jwt.claims to :'eastside';
do $$ begin
  begin
    perform public.owner_transition_job('80000000-0000-4000-8000-000000000001', 'owner_confirmed', 'x');
    raise exception 'Eastside moved Northside''s job';
  exception when no_data_found then null;
  end;
end $$;
rollback;

\echo '# marketing drafts use only consented media from the business''s own jobs'
begin;
set local role service_role;
do $$ begin
  begin
    insert into public.content_drafts (tenant_id, source_media_ids, caption, platforms)
    values ('10000000-0000-4000-8000-000000000001', array['60000000-0000-4000-8000-000000000001']::uuid[], 'Fixed!', array['facebook_page']::public.social_platform[]);
    raise exception 'draft without consent was allowed';
  exception when check_violation then null;
  end;
  insert into public.consents (conversation_id, kind, granted)
  values ('40000000-0000-4000-8000-000000000001', 'photos_for_marketing', true);
  insert into public.content_drafts (tenant_id, source_media_ids, caption, platforms)
  values ('10000000-0000-4000-8000-000000000001', array['60000000-0000-4000-8000-000000000001']::uuid[], 'Fixed!', array['facebook_page']::public.social_platform[]);
  begin
    insert into public.content_drafts (tenant_id, source_media_ids, caption, platforms)
    values ('10000000-0000-4000-8000-000000000002', array['60000000-0000-4000-8000-000000000001']::uuid[], 'Stolen', array['instagram']::public.social_platform[]);
    raise exception 'Eastside used Northside''s job photo';
  exception when check_violation then null;
  end;
end $$;
rollback;

\echo '# webhook retries do not duplicate messages'
begin;
set local role service_role;
do $$
declare inserted int;
begin
  insert into public.messages (conversation_id, sender, body, wa_message_id, delivery)
  values ('40000000-0000-4000-8000-000000000001', 'customer', 'retry', 'wamid.seed.ana.1', 'received')
  on conflict (wa_message_id) do nothing;
  get diagnostics inserted = row_count;
  assert inserted = 0, 'duplicate webhook delivery was stored';
end $$;
rollback;

\echo 'ok - functions'
