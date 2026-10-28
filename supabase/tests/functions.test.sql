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

\echo '# the agent searches from the customer''s shared location, never its own coordinates'
begin;
set local role service_role;
do $$ begin
  -- Northside already has Ana's handoff, so it is not suggested again.
  assert (select string_agg(slug || ':' || eta_minutes, ',' order by distance_km)
          from public.search_directory_for_conversation('40000000-0000-4000-8000-000000000001', 'plumbing',
               '{}', '2026-11-03T05:04:00Z')) = 'eastside:55', 'Ana''s next option';
  insert into public.messages (conversation_id, sender, kind, payload, body)
  values ('40000000-0000-4000-8000-000000000001', 'zukki', 'interactive',
          '{"variant":"suggest_business","business_id":"10000000-0000-4000-8000-000000000002"}', 'Eastside card');
  assert (select count(*) from public.search_directory_for_conversation('40000000-0000-4000-8000-000000000001', 'plumbing',
          '{}', '2026-11-03T05:04:00Z')) = 0, 'a business already suggested is not suggested twice';
  begin
    perform public.search_directory_for_conversation('40000000-0000-4000-8000-000000000002', 'plumbing');
    raise exception 'searched without a shared location';
  exception when no_data_found then null;
  end;
end $$;
rollback;

begin;
set local role authenticated;
set local request.jwt.claims to :'mario';
do $$ begin
  begin
    perform public.search_directory_for_conversation('40000000-0000-4000-8000-000000000001', 'plumbing');
    raise exception 'owners must not search by a customer''s location';
  exception when insufficient_privilege then null;
  end;
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
  h := public.decline_handoff('50000000-0000-4000-8000-000000000002', 'busy', 'no technician free');
  assert h.status = 'declined', 'status was ' || h.status;
  assert h.decline_reason = 'busy', 'decline reason stored';
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

\echo '# agent and customer moves are compare-and-set with an audit row'
begin;
set local role service_role;
do $$
declare j public.jobs;
begin
  j := public.record_job_transition('80000000-0000-4000-8000-000000000001', 'proposed', 'cancelled', 'customer', 'fixed it myself');
  assert j.state = 'cancelled', 'state was ' || j.state;
  assert (select count(*) from public.job_events where job_id = j.id and actor = 'customer' and from_state = 'proposed') = 1,
    'customer move logged';
  begin
    perform public.record_job_transition(j.id, 'proposed', 'triaged', 'agent', 'stale read');
    raise exception 'a stale from_state was applied';
  exception when serialization_failure then null;
  end;
  begin
    perform public.record_job_transition('80000000-0000-4000-8000-0000000000ff', 'proposed', 'triaged', 'agent', 'x');
    raise exception 'missing job was moved';
  exception when no_data_found then null;
  end;
  begin
    perform public.record_job_transition(j.id, 'cancelled', 'done', 'owner', 'owner via API');
    raise exception 'owner moves must use owner_transition_job';
  exception when sqlstate '22023' then null;
  end;
end $$;
rollback;

begin;
set local role authenticated;
set local request.jwt.claims to :'mario';
do $$ begin
  begin
    perform public.record_job_transition('80000000-0000-4000-8000-000000000001', 'proposed', 'owner_confirmed', 'agent', 'x');
    raise exception 'owners must not record agent moves';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

\echo '# message kinds: replies need a payload, locations never carry coordinates'
begin;
set local role service_role;
do $$ begin
  insert into public.messages (conversation_id, sender, kind, payload, wa_message_id, delivery)
  values ('40000000-0000-4000-8000-000000000001', 'customer', 'button_reply', '{"id":"done_no_cables","title":"Done, no cables"}',
          'wamid.test.button', 'received');
  insert into public.messages (conversation_id, sender, kind, payload, wa_message_id, delivery)
  values ('40000000-0000-4000-8000-000000000001', 'customer', 'location',
          '{"customer_location_id":"90000000-0000-4000-8000-000000000001"}', 'wamid.test.location', 'received');
  begin
    insert into public.messages (conversation_id, sender, kind, payload, delivery)
    values ('40000000-0000-4000-8000-000000000001', 'customer', 'location',
            '{"latitude":21.1619,"longitude":-86.8515}', 'received');
    raise exception 'coordinates were stored in a message';
  exception when check_violation then null;
  end;
  begin
    insert into public.messages (conversation_id, sender, kind, delivery)
    values ('40000000-0000-4000-8000-000000000001', 'customer', 'button_reply', 'received');
    raise exception 'button reply without payload was stored';
  exception when check_violation then null;
  end;
  assert (select kind from public.messages where id = '70000000-0000-4000-8000-000000000001') = 'media',
    'seeded video message should be kind media';
end $$;
rollback;

\echo '# option B: the owner picks between their text and Zukki''s version'
begin;
set local role authenticated;
set local request.jwt.claims to :'mario';
insert into public.message_drafts (id, conversation_id, tenant_id, author_user_id, original_body)
values ('a0000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'ok mario there 12:55');
do $$ begin
  begin
    update public.message_drafts set polished_body = 'self-polished' where id = 'a0000000-0000-4000-8000-000000000001';
    raise exception 'owners must not write the polished version';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.send_message_draft('a0000000-0000-4000-8000-000000000001', true);
    raise exception 'sent a polished version that does not exist';
  exception when sqlstate '22023' then null;
  end;
end $$;
reset role;
update public.message_drafts
set polished_body = 'Mario from Northside Plumbing will arrive at about 12:55 AM.'
where id = 'a0000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$
declare m public.messages;
begin
  m := public.send_message_draft('a0000000-0000-4000-8000-000000000001', true);
  assert m.polished and m.kind = 'interactive' and m.delivery = 'queued', 'polished message queued as interactive';
  assert m.body = 'Mario from Northside Plumbing will arrive at about 12:55 AM.', 'polished body sent';
  assert (select status from public.message_drafts where id = 'a0000000-0000-4000-8000-000000000001') = 'sent_polished',
    'draft resolved';
  begin
    perform public.send_message_draft('a0000000-0000-4000-8000-000000000001', false);
    raise exception 'draft sent twice';
  exception when sqlstate '22023' then null;
  end;
end $$;
rollback;

begin;
set local role authenticated;
set local request.jwt.claims to :'eastside';
do $$ begin
  begin
    insert into public.message_drafts (conversation_id, tenant_id, author_user_id, original_body)
    values ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002',
            '20000000-0000-4000-8000-000000000002', 'hi Ana');
    raise exception 'Eastside drafted into Ana''s chat';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

\echo '# the accept window comes from platform settings'
begin;
set local role service_role;
do $$
declare h public.handoffs;
begin
  update public.platform_settings set normal_accept_window = interval '10 minutes';
  update public.handoffs set status = 'declined', resolved_at = now() where id = '50000000-0000-4000-8000-000000000002';
  h := public.create_handoff('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001');
  assert h.expires_at - h.offered_at = interval '10 minutes', 'window was ' || (h.expires_at - h.offered_at);
  begin
    update public.platform_settings set urgent_accept_window = interval '5 seconds';
    raise exception 'a 5-second window was allowed';
  exception when check_violation then null;
  end;
  insert into public.price_rules (tenant_id, item, kind, min_amount, max_amount, conditions)
  values ('10000000-0000-4000-8000-000000000001', 'Parking', 'extra_fee', 5, 5, 'Downtown only');
end $$;
rollback;

\echo '# marketing drafts use only consented media from the business''s own jobs'
begin;
set local role service_role;
do $$ begin
  begin
    insert into public.content_drafts (tenant_id, source, source_job_id, source_media_ids, caption, platforms)
    values ('10000000-0000-4000-8000-000000000001', 'job', '80000000-0000-4000-8000-000000000001',
            array['60000000-0000-4000-8000-000000000001']::uuid[], 'Fixed!', array['facebook_page']::public.social_platform[]);
    raise exception 'draft without consent was allowed';
  exception when check_violation then null;
  end;
  insert into public.consents (conversation_id, kind, granted)
  values ('40000000-0000-4000-8000-000000000001', 'photos_for_marketing', true);
  insert into public.content_drafts (tenant_id, source, source_job_id, source_media_ids, caption, platforms)
  values ('10000000-0000-4000-8000-000000000001', 'job', '80000000-0000-4000-8000-000000000001',
          array['60000000-0000-4000-8000-000000000001']::uuid[], 'Fixed!', array['facebook_page']::public.social_platform[]);
  begin
    insert into public.content_drafts (tenant_id, source, source_job_id, source_media_ids, caption, platforms)
    values ('10000000-0000-4000-8000-000000000002', 'prices', null,
            array['60000000-0000-4000-8000-000000000001']::uuid[], 'Stolen', array['instagram']::public.social_platform[]);
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

\echo '# quotes: the owner sends, the customer approves only the current one'
begin;
set local role authenticated;
set local request.jwt.claims to :'mario';
do $$
declare first public.quotes; second public.quotes;
begin
  first := public.send_quote('80000000-0000-4000-8000-000000000001',
    '[{"label":"Visit","min":45,"max":45},{"label":"Night fee","min":25,"max":25},{"label":"Fill valve repair","min":60,"max":90}]',
    '2026-11-03T05:55:00Z', '2026-11-03T06:25:00Z', 'b0000000-0000-4000-8000-000000000001');
  assert first.total_min = 130 and first.total_max = 160, 'totals are the sum of the lines';
  assert (select state from public.jobs where id = first.job_id) = 'owner_confirmed', 'sending confirms the job';
  assert (select arrival_window from public.jobs where id = first.job_id) = '12:55–1:25 AM', 'local arrival window';
  second := public.send_quote(first.job_id, '[{"label":"Visit","min":45,"max":45},{"label":"Repair","min":70,"max":90}]',
    '2026-11-03T05:55:00Z', '2026-11-03T06:25:00Z');
  assert (select status from public.quotes where id = first.id) = 'superseded', 'a new quote replaces the old one';
  begin
    perform public.send_quote(first.job_id, '[{"label":"Visit","min":50,"max":40}]', now(), now());
    raise exception 'a line with max < min was accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.send_quote(first.job_id, '[{"label":"Visit","min":"lots","max":40}]', now(), now());
    raise exception 'a non-numeric amount was accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.send_quote(first.job_id, '[{"label":"Visit","min":45,"max":45}]', now(), now(),
      'b0000000-0000-4000-8000-000000000002');
    raise exception 'assigned another business''s technician';
  exception when foreign_key_violation then null;
  end;
end $$;
reset role;
set local role service_role;
do $$
declare current_quote uuid; old_quote uuid; q public.quotes;
begin
  select id into current_quote from public.quotes where status = 'sent';
  select id into old_quote from public.quotes where status = 'superseded';
  begin
    perform public.approve_quote(old_quote);
    raise exception 'an old quote button approved the job';
  exception when sqlstate '22023' then null;
  end;
  q := public.approve_quote(current_quote);
  assert q.status = 'approved', 'quote approved';
  assert (select state from public.jobs where id = q.job_id) = 'customer_approved', 'job approved by the customer';
  assert (select count(*) from public.job_events where job_id = q.job_id and actor = 'customer') = 1, 'approval logged';
end $$;
reset role;
set local role authenticated;
set local request.jwt.claims to :'mario';
do $$ begin
  assert (select count(*) from public.customer_locations) = 1, 'the address unlocks after approval';
end $$;
rollback;

\echo '# an offer records distance and the business''s own accept window'
begin;
set local role service_role;
do $$
declare h public.handoffs;
begin
  insert into public.customer_locations (conversation_id, location)
  values ('40000000-0000-4000-8000-000000000002', private.geo_point(21.1619, -86.8515));
  update public.tenants set normal_accept_window = interval '15 minutes' where slug = 'northside';
  update public.handoffs set status = 'declined', resolved_at = now() where id = '50000000-0000-4000-8000-000000000002';
  h := public.create_handoff('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 115, 145);
  assert h.distance_km = 1.2, 'distance was ' || h.distance_km;
  assert h.expires_at - h.offered_at = interval '15 minutes', 'business override wins';
  assert h.suggested_min = 115 and h.suggested_max = 145, 'suggested quote stored';
end $$;
rollback;

\echo '# technicians, read markers and consent requests'
begin;
set local role authenticated;
set local request.jwt.claims to :'eastside';
do $$ begin
  assert (select count(*) from public.technicians) = 1, 'Eastside sees only its technician';
  begin
    insert into public.conversation_reads (user_id, conversation_id)
    values ('20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001');
    raise exception 'Eastside marked Ana''s chat as read';
  exception when insufficient_privilege then null;
  end;
end $$;
set local request.jwt.claims to :'mario';
insert into public.conversation_reads (user_id, conversation_id)
values ('20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001')
on conflict (user_id, conversation_id) do update set last_read_at = excluded.last_read_at;
reset role;
do $$ begin
  insert into public.consents (conversation_id, kind, granted)
  values ('40000000-0000-4000-8000-000000000001', 'photos_for_marketing', null);
  begin
    insert into public.price_rules (tenant_id, item, kind, min_amount, max_amount, at_cost)
    values ('10000000-0000-4000-8000-000000000001', 'Visit', 'callout', 0, 0, true);
    raise exception 'at cost is only for extra fees';
  exception when check_violation then null;
  end;
  insert into public.price_rules (tenant_id, item, kind, min_amount, max_amount, at_cost)
  values ('10000000-0000-4000-8000-000000000001', 'Parts', 'extra_fee', 0, 0, true);
end $$;
rollback;

\echo 'ok - functions'
