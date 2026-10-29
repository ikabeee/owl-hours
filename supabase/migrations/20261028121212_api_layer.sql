-- Request/response layer for apps/api.
-- * WhatsApp intake (server only): idempotent on WhatsApp's message id and
--   serialized per customer, so retries and bursts never duplicate a
--   message or open two conversations.
-- * Outbox: owner and Zukki messages waiting to go out, claimed with
--   SKIP LOCKED so two workers never send the same message.
-- * One read per owner screen, SECURITY INVOKER: row-level security still
--   decides what each business sees.

-- WhatsApp intake ----------------------------------------------------------

-- A message after 24 hours of silence starts a new conversation (WhatsApp's
-- customer service window), unless a business chat is still open.
create function public.resolve_inbound_conversation(
  p_wa_id text,
  p_profile_name text default null,
  p_at timestamptz default now()
)
returns table (conversation_id uuid, customer_id uuid, is_new boolean, open_tenant_id uuid)
language plpgsql security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_customer uuid;
  v_conversation uuid;
  v_new boolean := false;
  v_tenant uuid;
begin
  if p_wa_id is null or p_wa_id !~ '^[0-9]{6,20}$' then
    raise exception 'wa_id must be 6-20 digits' using errcode = '22023';
  end if;
  -- One intake at a time per customer.
  perform pg_advisory_xact_lock(hashtextextended('zukki:wa:' || p_wa_id, 0));

  insert into public.customers (wa_id, display_name)
  values (p_wa_id, nullif(left(btrim(p_profile_name), 80), ''))
  on conflict (wa_id) do update
    set display_name = coalesce(public.customers.display_name, excluded.display_name)
  returning id into v_customer;

  select c.id into v_conversation
  from public.conversations c
  where c.customer_id = v_customer
    and (c.last_message_at > p_at - interval '24 hours'
         or exists (select 1 from public.handoffs h where h.conversation_id = c.id and h.status = 'accepted'))
  order by c.last_message_at desc
  limit 1;

  if v_conversation is null then
    insert into public.conversations (customer_id, last_message_at, created_at)
    values (v_customer, p_at, p_at)
    returning id into v_conversation;
    v_new := true;
  end if;

  select h.tenant_id into v_tenant
  from public.handoffs h
  where h.conversation_id = v_conversation and h.status = 'accepted';

  return query select v_conversation, v_customer, v_new, v_tenant;
end
$$;

-- One inbound message (text, media, button or list reply). Customer
-- messages in an open business chat carry that business's tenant_id, so a
-- business offered the request later does not read them.
create function public.record_inbound_message(
  p_wa_id text,
  p_wa_message_id text,
  p_kind public.message_kind,
  p_body text default null,
  p_payload jsonb default null,
  p_media_id uuid default null,
  p_profile_name text default null,
  p_at timestamptz default now()
)
returns table (conversation_id uuid, message_id uuid, duplicate boolean, is_new_conversation boolean, open_tenant_id uuid)
language plpgsql security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  r record;
  existing public.messages;
  v_message uuid;
begin
  if p_wa_message_id is null or char_length(p_wa_message_id) not between 1 and 128 then
    raise exception 'wa_message_id is required' using errcode = '22023';
  end if;
  if p_kind not in ('text', 'media', 'button_reply', 'list_reply') then
    raise exception 'use save_customer_location for locations; % is not an inbound kind', p_kind using errcode = '22023';
  end if;

  select * into existing from public.messages m where m.wa_message_id = p_wa_message_id;
  if found then
    return query select existing.conversation_id, existing.id, true, false, existing.tenant_id;
    return;
  end if;

  select * into r from public.resolve_inbound_conversation(p_wa_id, p_profile_name, p_at);

  -- A retry may have landed while we waited for the customer's lock.
  select * into existing from public.messages m where m.wa_message_id = p_wa_message_id;
  if found then
    return query select existing.conversation_id, existing.id, true, false, existing.tenant_id;
    return;
  end if;

  if p_media_id is not null
     and not exists (select 1 from public.media m where m.id = p_media_id and m.conversation_id = r.conversation_id) then
    raise exception 'media belongs to another conversation' using errcode = '22023';
  end if;

  insert into public.messages (conversation_id, tenant_id, sender, body, kind, payload, media_id, wa_message_id,
                               delivery, created_at)
  values (r.conversation_id, r.open_tenant_id, 'customer', p_body, p_kind, p_payload, p_media_id, p_wa_message_id,
          'received', p_at)
  on conflict (wa_message_id) do nothing
  returning id into v_message;

  return query select r.conversation_id, v_message, v_message is null, r.is_new, r.open_tenant_id;
end
$$;

-- A shared location: coordinates go to customer_locations, the message only
-- references them (offered businesses can read messages before approval).
create function public.save_customer_location(
  p_conversation_id uuid,
  p_wa_message_id text,
  p_latitude double precision,
  p_longitude double precision,
  p_address text default null,
  p_at timestamptz default now()
)
returns table (message_id uuid, customer_location_id uuid, duplicate boolean)
language plpgsql security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  c public.conversations;
  existing public.messages;
  v_location uuid;
  v_message uuid;
begin
  if p_latitude is null or p_latitude not between -90 and 90
     or p_longitude is null or p_longitude not between -180 and 180 then
    raise exception 'latitude or longitude out of range' using errcode = '22023';
  end if;
  if p_wa_message_id is null or char_length(p_wa_message_id) not between 1 and 128 then
    raise exception 'wa_message_id is required' using errcode = '22023';
  end if;
  select * into c from public.conversations where id = p_conversation_id for update;
  if not found then
    raise exception 'conversation not found' using errcode = 'P0002';
  end if;
  select * into existing from public.messages m where m.wa_message_id = p_wa_message_id;
  if found then
    return query select existing.id, (existing.payload ->> 'customer_location_id')::uuid, true;
    return;
  end if;

  insert into public.customer_locations (conversation_id, location, address, shared_at)
  values (c.id, private.geo_point(p_latitude, p_longitude), nullif(left(btrim(p_address), 300), ''), p_at)
  returning id into v_location;
  insert into public.messages (conversation_id, sender, kind, payload, wa_message_id, delivery, created_at)
  values (c.id, 'customer', 'location', jsonb_build_object('customer_location_id', v_location), p_wa_message_id,
          'received', p_at)
  returning id into v_message;
  return query select v_message, v_location, false;
end
$$;

-- Outbox -------------------------------------------------------------------

-- Claims queued owner and Zukki messages and marks them sent. Report the
-- WhatsApp result with record_outbound_result; a claimed message with no
-- wa_message_id after a crash is visible as delivery = 'sent' and
-- wa_message_id is null.
create function public.claim_outbox(p_limit integer default 20)
returns jsonb
language sql volatile security invoker
set search_path = ''
as $$
  with picked as (
    select m.id from public.messages m
    where m.delivery = 'queued' and m.sender <> 'customer'
    order by m.created_at
    limit greatest(1, least(coalesce(p_limit, 20), 100))
    for update skip locked
  ),
  claimed as (
    update public.messages m set delivery = 'sent'
    from picked where m.id = picked.id
    returning m.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', cl.id,
    'conversationId', cl.conversation_id,
    'waId', cu.wa_id,
    'sender', cl.sender,
    'kind', cl.kind,
    'body', cl.body,
    'payload', cl.payload,
    'polished', cl.polished,
    'mediaId', cl.media_id,
    'businessName', t.name,
    'businessShortName', t.short_name,
    'createdAt', cl.created_at
  ) order by cl.created_at), '[]'::jsonb)
  from claimed cl
  join public.conversations cv on cv.id = cl.conversation_id
  join public.customers cu on cu.id = cv.customer_id
  left join public.tenants t on t.id = cl.tenant_id
$$;

-- WhatsApp's answer to a send: its message id, or null when it failed.
create function public.record_outbound_result(p_message_id uuid, p_wa_message_id text)
returns public.messages
language plpgsql security invoker
set search_path = ''
as $$
declare
  m public.messages;
begin
  update public.messages
  set wa_message_id = coalesce(p_wa_message_id, wa_message_id),
      delivery = case when p_wa_message_id is null then 'failed'::public.delivery_status
                      else 'sent'::public.delivery_status end
  where id = p_message_id and sender <> 'customer' and delivery in ('queued', 'sent')
  returning * into m;
  if not found then
    raise exception 'message not found or already reported' using errcode = 'P0002';
  end if;
  return m;
end
$$;

-- Status webhooks: delivered and read only move forward; failed only
-- before delivery. Returns false for unknown ids or stale updates.
create function public.record_delivery_status(p_wa_message_id text, p_status public.delivery_status)
returns boolean
language plpgsql security invoker
set search_path = ''
as $$
declare
  updated integer;
begin
  if p_status not in ('delivered', 'read', 'failed') then
    raise exception 'status must be delivered, read or failed' using errcode = '22023';
  end if;
  update public.messages
  set delivery = p_status
  where wa_message_id = p_wa_message_id
    and sender <> 'customer'
    and case p_status
      when 'delivered' then delivery in ('queued', 'sent')
      when 'read' then delivery in ('queued', 'sent', 'delivered')
      else delivery in ('queued', 'sent')
    end;
  get diagnostics updated = row_count;
  return updated > 0;
end
$$;

-- Owner screens ---------------------------------------------------------

-- Requests (handoff offers) for the signed-in owner's businesses.
create function public.owner_offers(p_status public.handoff_status default 'offered', p_limit integer default 50)
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.item order by s.offered_at desc), '[]'::jsonb)
  from (
    select h.offered_at, jsonb_build_object(
      'id', h.id,
      'conversationId', h.conversation_id,
      'businessId', h.tenant_id,
      'status', h.status,
      'urgent', h.urgency = 'now',
      'distanceKm', h.distance_km,
      'suggestedQuote', case when h.suggested_min is null then null
                             else jsonb_build_object('min', h.suggested_min, 'max', h.suggested_max) end,
      'offeredAt', h.offered_at,
      'expiresAt', h.expires_at,
      'declineReason', h.decline_reason,
      'title', c.title,
      'zukkiSummary', c.summary,
      'customerName', cu.display_name,
      'approxLocation', cu.approx_area,
      'customerQuote', (
        select m.transcript from public.media m
        where m.conversation_id = c.id and m.kind = 'audio' and m.transcript is not null
        order by m.created_at desc limit 1),
      'media', coalesce((
        select jsonb_agg(jsonb_build_object('id', m.id, 'kind', m.kind, 'role', m.role, 'storagePath', m.storage_path,
                                            'thumbPath', m.thumb_path, 'durationMs', m.duration_ms)
                         order by m.created_at)
        from public.media m
        where m.conversation_id = c.id and m.kind in ('video', 'image') and m.role in ('evidence', 'marked_frame')),
        '[]'::jsonb)
    ) as item
    from public.handoffs h
    left join public.conversations c on c.id = h.conversation_id
    left join public.customers cu on cu.id = c.customer_id
    where h.status = p_status
    order by h.offered_at desc
    limit greatest(1, least(coalesce(p_limit, 50), 100))
  ) s
$$;

-- Chats the owner's businesses accepted, newest first, with unread counts.
create function public.owner_conversations(p_limit integer default 50)
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.item order by s.last_at desc), '[]'::jsonb)
  from (
    select c.last_message_at as last_at, jsonb_build_object(
      'id', c.id,
      'offerId', h.id,
      'businessId', h.tenant_id,
      'title', c.title,
      'customerName', cu.display_name,
      'chatOpen', h.status = 'accepted',
      'lastMessageAt', c.last_message_at,
      'job', (
        select jsonb_build_object('id', j.id, 'state', j.state, 'arrivalWindow', j.arrival_window)
        from public.jobs j where j.conversation_id = c.id and j.tenant_id = h.tenant_id
        order by j.created_at desc limit 1),
      'lastMessage', (
        select jsonb_build_object('id', m.id, 'from', m.sender, 'kind', m.kind, 'text', m.body, 'sentAt', m.created_at)
        from public.messages m where m.conversation_id = c.id
        order by m.created_at desc limit 1),
      'unread', (
        select count(*) from public.messages m
        where m.conversation_id = c.id and m.sender <> 'owner'
          and m.created_at > coalesce((
            select r.last_read_at from public.conversation_reads r
            where r.user_id = (select auth.uid()) and r.conversation_id = c.id), '-infinity'::timestamptz))
    ) as item
    from public.handoffs h
    join public.conversations c on c.id = h.conversation_id
    left join public.customers cu on cu.id = c.customer_id
    where h.status in ('accepted', 'closed')
    order by c.last_message_at desc
    limit greatest(1, least(coalesce(p_limit, 50), 100))
  ) s
$$;

-- One page of a chat, oldest first. Page back with p_before = the first sentAt.
create function public.owner_conversation_messages(
  p_conversation_id uuid,
  p_before timestamptz default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql stable security invoker
set search_path = ''
as $$
declare
  page jsonb;
begin
  if not exists (select 1 from public.conversations c where c.id = p_conversation_id) then
    raise exception 'conversation not found' using errcode = 'P0002';
  end if;
  select coalesce(jsonb_agg(s.item order by s.created_at), '[]'::jsonb) into page
  from (
    select m.created_at, jsonb_build_object(
      'id', m.id,
      'from', m.sender,
      'kind', m.kind,
      'text', m.body,
      'payload', m.payload,
      'sentAt', m.created_at,
      'status', m.delivery,
      'delivery', case when m.sender = 'owner' then case when m.polished then 'polished' else 'as_written' end end,
      'media', case when md.id is null then null
                    else jsonb_build_object('id', md.id, 'kind', md.kind, 'storagePath', md.storage_path,
                                            'durationMs', md.duration_ms, 'transcript', md.transcript) end
    ) as item
    from public.messages m
    left join public.media md on md.id = m.media_id
    where m.conversation_id = p_conversation_id and (p_before is null or m.created_at < p_before)
    order by m.created_at desc
    limit greatest(1, least(coalesce(p_limit, 50), 200))
  ) s;
  return page;
end
$$;

-- Jobs with the current quote, technician, timeline and photo consent.
-- The address appears only once the customer approved the visit (RLS).
create function public.owner_jobs(p_job_id uuid default null, p_limit integer default 50)
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.item order by s.updated_at desc), '[]'::jsonb)
  from (
    select j.updated_at, jsonb_build_object(
      'id', j.id,
      'conversationId', j.conversation_id,
      'businessId', j.tenant_id,
      'title', j.title,
      'state', j.state,
      'customerName', cu.display_name,
      'technicianId', j.technician_id,
      'technician', t.display_name,
      'arrivalWindow', j.arrival_window,
      'currency', j.currency,
      'total', case when j.total_min is null then null else jsonb_build_object('min', j.total_min, 'max', j.total_max) end,
      'finalTotal', j.final_total,
      'location', (
        select jsonb_build_object('address', l.address,
                                  'latitude', extensions.st_y(l.location::extensions.geometry),
                                  'longitude', extensions.st_x(l.location::extensions.geometry))
        from public.customer_locations l where l.conversation_id = j.conversation_id
        order by l.shared_at desc limit 1),
      'quote', (
        select jsonb_build_object('id', q.id, 'status', q.status, 'lines', q.lines,
                                  'total', jsonb_build_object('min', q.total_min, 'max', q.total_max),
                                  'arrivalFrom', q.arrival_from, 'arrivalTo', q.arrival_to, 'note', q.note,
                                  'sentAt', q.sent_at)
        from public.quotes q where q.job_id = j.id and q.status <> 'superseded'
        order by q.sent_at desc limit 1),
      'shareConsent', coalesce((
        select case when cs.granted is null then 'asked' when cs.granted then 'yes' else 'no' end
        from public.consents cs
        where cs.conversation_id = j.conversation_id and cs.kind = 'photos_for_marketing'
        order by cs.at desc, cs.id desc limit 1), 'not_asked'),
      'timeline', coalesce((
        select jsonb_agg(jsonb_build_object('at', e.at, 'actor', e.actor, 'from', e.from_state, 'to', e.to_state)
                         order by e.at)
        from public.job_events e where e.job_id = j.id), '[]'::jsonb)
    ) as item
    from public.jobs j
    left join public.technicians t on t.id = j.technician_id
    left join public.conversations c on c.id = j.conversation_id
    left join public.customers cu on cu.id = c.customer_id
    where p_job_id is null or j.id = p_job_id
    order by j.updated_at desc
    limit greatest(1, least(coalesce(p_limit, 50), 100))
  ) s
$$;

-- Read marker for the signed-in user (unread counts). Covers the newest
-- message even when WhatsApp's timestamp is ahead of the server clock.
create function public.mark_conversation_read(p_conversation_id uuid)
returns void
language sql security invoker
set search_path = ''
as $$
  insert into public.conversation_reads (user_id, conversation_id, last_read_at)
  values ((select auth.uid()), p_conversation_id,
          greatest(now(), (select max(m.created_at) from public.messages m where m.conversation_id = p_conversation_id)))
  on conflict (user_id, conversation_id) do update
    set last_read_at = greatest(public.conversation_reads.last_read_at, excluded.last_read_at)
$$;

-- Execute rights ------------------------------------------------------------

revoke all on function
  public.resolve_inbound_conversation(text, text, timestamptz),
  public.record_inbound_message(text, text, public.message_kind, text, jsonb, uuid, text, timestamptz),
  public.save_customer_location(uuid, text, double precision, double precision, text, timestamptz),
  public.claim_outbox(integer),
  public.record_outbound_result(uuid, text),
  public.record_delivery_status(text, public.delivery_status)
from public, anon, authenticated;
grant execute on function
  public.resolve_inbound_conversation(text, text, timestamptz),
  public.record_inbound_message(text, text, public.message_kind, text, jsonb, uuid, text, timestamptz),
  public.save_customer_location(uuid, text, double precision, double precision, text, timestamptz),
  public.claim_outbox(integer),
  public.record_outbound_result(uuid, text),
  public.record_delivery_status(text, public.delivery_status)
to service_role;

revoke all on function
  public.owner_offers(public.handoff_status, integer),
  public.owner_conversations(integer),
  public.owner_conversation_messages(uuid, timestamptz, integer),
  public.owner_jobs(uuid, integer),
  public.mark_conversation_read(uuid)
from public, anon;
grant execute on function
  public.owner_offers(public.handoff_status, integer),
  public.owner_conversations(integer),
  public.owner_conversation_messages(uuid, timestamptz, integer),
  public.owner_jobs(uuid, integer),
  public.mark_conversation_read(uuid)
to authenticated, service_role;
