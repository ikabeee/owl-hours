-- Business logic that must hold no matter which client calls it: matching,
-- the handoff timer, owner job transitions and draft review. Each function
-- locks the row it changes and writes the audit event in the same
-- transaction.
--
-- Errors (PostgREST returns them as JSON with the code):
--   P0002 no_data_found          row missing or not yours (same answer, no leak)
--   22023 invalid_parameter_value state does not allow the action
--   23505 unique_violation        a second open handoff for one conversation
--   23514 check_violation         draft media without consent or from another business

-- Directory --------------------------------------------------------------

create function private.is_open(p_tenant_id uuid, p_at timestamptz)
returns boolean
language sql stable
set search_path = ''
as $$
  with local_time as (
    select (p_at at time zone t.timezone) as ts from public.tenants t where t.id = p_tenant_id
  ),
  parts as (
    select extract(dow from ts)::int as dow, ts::time as tod from local_time
  )
  select exists (
    select 1 from public.business_hours h, parts p
    where h.tenant_id = p_tenant_id
      and (
        (h.opens < h.closes and h.weekday = p.dow and p.tod >= h.opens and p.tod < h.closes)
        or (h.opens > h.closes and h.weekday = p.dow and p.tod >= h.opens)
        or (h.opens > h.closes and h.weekday = (p.dow + 6) % 7 and p.tod < h.closes)
      )
  )
$$;

-- Available = accepting requests now, and either open by its hours or
-- taking night jobs; the customer's point must fall in a service area.
-- Ranking (handoff open question 3, default): distance, then rating.
create function public.search_directory(
  p_category text,
  p_lat double precision,
  p_lng double precision,
  p_at timestamptz default now(),
  p_exclude uuid[] default '{}',
  p_limit integer default 3,
  p_max_km double precision default 50
)
returns table (
  tenant_id uuid,
  slug text,
  name text,
  rating numeric,
  review_count integer,
  night_jobs boolean,
  open_now boolean,
  distance_km numeric
)
language sql stable
set search_path = ''
as $$
  with here as (select private.geo_point(p_lat, p_lng) as g),
  candidates as (
    select t.*, private.is_open(t.id, p_at) as is_open_now,
           extensions.st_distance(t.location, here.g) as meters
    from public.tenants t, here
    where t.category = p_category
      and t.accepts_now
      and t.id <> all (coalesce(p_exclude, '{}'))
      -- Constant radius so the GiST index on tenants.location is used.
      and extensions.st_dwithin(t.location, here.g, p_max_km * 1000)
      and exists (
        select 1 from public.service_areas a
        where a.tenant_id = t.id and extensions.st_dwithin(a.center, here.g, a.radius_km * 1000)
      )
  )
  select c.id, c.slug, c.name, c.rating, c.review_count, c.night_jobs, c.is_open_now,
         round((c.meters / 1000)::numeric, 1)
  from candidates c
  where c.is_open_now or c.night_jobs
  order by c.meters, c.rating desc nulls last
  limit greatest(1, least(coalesce(p_limit, 3), 10))
$$;

-- Handoffs ---------------------------------------------------------------

-- Called by the Platform API when the customer taps Connect me.
create function public.create_handoff(
  p_conversation_id uuid,
  p_tenant_id uuid,
  p_now timestamptz default now()
)
returns public.handoffs
language plpgsql security definer
set search_path = ''
as $$
declare
  c public.conversations;
  h public.handoffs;
begin
  select * into c from public.conversations where id = p_conversation_id for update;
  if not found then
    raise exception 'conversation % not found', p_conversation_id using errcode = 'P0002';
  end if;
  if c.urgency is null then
    raise exception 'conversation % has no urgency yet', p_conversation_id using errcode = '22023';
  end if;

  insert into public.handoffs (conversation_id, tenant_id, urgency, attempt, offered_at, expires_at)
  values (
    c.id, p_tenant_id, c.urgency,
    coalesce((select max(attempt) from public.handoffs where conversation_id = c.id), 0) + 1,
    p_now,
    -- Product rule 4: 5 minutes for urgent requests, 30 for the rest.
    p_now + case c.urgency when 'now' then interval '5 minutes' else interval '30 minutes' end
  )
  returning * into h;

  update public.conversations set state = 'offered', active_handoff_id = h.id where id = c.id;
  insert into public.handoff_events (handoff_id, tenant_id, actor, from_status, to_status, reason)
  values (h.id, h.tenant_id, 'system', null, 'offered', 'customer asked to connect');
  return h;
end
$$;

-- Locks a handoff the caller's business may answer, or fails without
-- saying whether it exists.
create function private.lock_own_handoff(p_handoff_id uuid)
returns public.handoffs
language plpgsql security definer
set search_path = ''
as $$
declare
  h public.handoffs;
begin
  select * into h from public.handoffs where id = p_handoff_id for update;
  if not found or h.tenant_id not in (select private.user_tenant_ids()) then
    raise exception 'handoff not found' using errcode = 'P0002';
  end if;
  return h;
end
$$;

create function private.resolve_handoff(
  h public.handoffs,
  p_status public.handoff_status,
  p_actor public.job_actor,
  p_reason text
)
returns public.handoffs
language plpgsql security definer
set search_path = ''
as $$
declare
  resolved public.handoffs;
begin
  update public.handoffs set status = p_status, resolved_at = now()
  where id = h.id
  returning * into resolved;

  update public.conversations
  set state = case when p_status = 'accepted' then 'accepted'::public.conversation_state
                   else 'matched'::public.conversation_state end,
      active_handoff_id = case when p_status = 'accepted' then h.id else null end
  where id = h.conversation_id and (active_handoff_id = h.id or active_handoff_id is null);

  insert into public.handoff_events (handoff_id, tenant_id, actor, actor_user_id, from_status, to_status, reason)
  values (h.id, h.tenant_id, p_actor, (select auth.uid()), h.status, p_status, p_reason);
  return resolved;
end
$$;

-- Owner taps Accept. A late tap expires the offer and returns it with
-- status 'expired' so the app can say "this request went to another
-- business" (the transaction still commits the expiry).
create function public.accept_handoff(p_handoff_id uuid)
returns public.handoffs
language plpgsql security definer
set search_path = ''
as $$
declare
  h public.handoffs := private.lock_own_handoff(p_handoff_id);
begin
  if h.status <> 'offered' then
    raise exception 'handoff is already %', h.status using errcode = '22023';
  end if;
  if now() >= h.expires_at then
    return private.resolve_handoff(h, 'expired', 'system', 'accepted after the window closed');
  end if;
  return private.resolve_handoff(h, 'accepted', 'owner', null);
end
$$;

create function public.decline_handoff(p_handoff_id uuid, p_reason text default null)
returns public.handoffs
language plpgsql security definer
set search_path = ''
as $$
declare
  h public.handoffs := private.lock_own_handoff(p_handoff_id);
begin
  if h.status <> 'offered' then
    raise exception 'handoff is already %', h.status using errcode = '22023';
  end if;
  if char_length(p_reason) > 500 then
    raise exception 'reason is too long' using errcode = '22023';
  end if;
  return private.resolve_handoff(h, 'declined', 'owner', p_reason);
end
$$;

-- Timer: run every minute (pg_cron, see the platform migration) or from the
-- Platform API. SKIP LOCKED lets several workers run it safely. The API
-- offers the next business for each returned row.
create function public.expire_handoffs(p_now timestamptz default now(), p_limit integer default 500)
returns setof public.handoffs
language sql security definer
set search_path = ''
as $$
  with due as (
    select id from public.handoffs
    where status = 'offered' and expires_at <= p_now
    order by expires_at
    limit p_limit
    for update skip locked
  ),
  expired as (
    update public.handoffs h set status = 'expired', resolved_at = p_now
    from due where h.id = due.id
    returning h.*
  ),
  logged as (
    insert into public.handoff_events (handoff_id, tenant_id, actor, from_status, to_status, reason)
    select e.id, e.tenant_id, 'system', 'offered', 'expired', 'no answer in time' from expired e
  ),
  rematched as (
    update public.conversations c set state = 'matched', active_handoff_id = null
    from expired e where c.id = e.conversation_id and c.active_handoff_id = e.id
  )
  select * from expired
$$;

-- Jobs -------------------------------------------------------------------

-- Owner side of packages/shared/src/job-states.ts. Agent and customer moves
-- go through the API with service_role and the TypeScript validator.
create function public.owner_transition_job(p_job_id uuid, p_to public.job_state, p_reason text)
returns public.jobs
language plpgsql security definer
set search_path = ''
as $$
declare
  j public.jobs;
  from_state public.job_state;
  allowed boolean;
begin
  if p_reason is null or char_length(p_reason) not between 1 and 500 then
    raise exception 'a reason of 1-500 characters is required' using errcode = '22023';
  end if;
  select * into j from public.jobs where id = p_job_id for update;
  if not found or j.tenant_id not in (select private.user_tenant_ids()) then
    raise exception 'job not found' using errcode = 'P0002';
  end if;

  from_state := j.state;
  allowed := case
    when from_state in ('done', 'declined', 'cancelled') then false
    when p_to in ('declined', 'cancelled') then from_state <> 'on_site'
    else (from_state = 'proposed' and p_to = 'owner_confirmed')
      or (from_state = 'customer_approved' and p_to = 'en_route')
      or (from_state = 'en_route' and p_to = 'on_site')
      or (from_state = 'on_site' and p_to = 'done')
  end;
  if not allowed then
    raise exception 'cannot move job from % to % as owner', from_state, p_to using errcode = '22023';
  end if;

  update public.jobs set state = p_to where id = j.id returning * into j;
  insert into public.job_events (job_id, tenant_id, actor, actor_user_id, from_state, to_state, reason)
  values (j.id, j.tenant_id, 'owner', (select auth.uid()), from_state, p_to, p_reason);
  return j;
end
$$;

-- Content ----------------------------------------------------------------

create function public.review_content_draft(p_draft_id uuid, p_approve boolean)
returns public.content_drafts
language plpgsql security definer
set search_path = ''
as $$
declare
  d public.content_drafts;
begin
  select * into d from public.content_drafts where id = p_draft_id for update;
  if not found or d.tenant_id not in (select private.user_owner_tenant_ids()) then
    raise exception 'draft not found' using errcode = 'P0002';
  end if;
  if d.status <> 'draft' then
    raise exception 'draft is already %', d.status using errcode = '22023';
  end if;
  update public.content_drafts
  set status = case when p_approve then 'approved'::public.draft_status else 'rejected'::public.draft_status end,
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where id = d.id
  returning * into d;
  return d;
end
$$;

-- Product rule 9: job photos only with the customer's latest consent, and
-- only from conversations this business actually handled.
create function private.check_draft_media()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  bad uuid;
begin
  select s.media_id into bad
  from unnest(new.source_media_ids) as s(media_id)
  left join public.media m on m.id = s.media_id
  where m.id is null
     or not exists (
       select 1 from public.handoffs h
       where h.conversation_id = m.conversation_id
         and h.tenant_id = new.tenant_id
         and h.status in ('accepted', 'closed')
     )
     or not coalesce((
       select c.granted from public.consents c
       where c.conversation_id = m.conversation_id and c.kind = 'photos_for_marketing'
       order by c.at desc, c.id desc
       limit 1
     ), false)
  limit 1;
  if found then
    raise exception 'media % needs the customer''s consent and must come from this business''s own job', bad
      using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger content_drafts_check_media
  before insert or update of source_media_ids, tenant_id on public.content_drafts
  for each row execute function private.check_draft_media();

-- Keeps the conversation list ordered without letting owners update it.
create function private.bump_conversation()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.conversations set last_message_at = new.created_at
  where id = new.conversation_id and last_message_at < new.created_at;
  return null;
end
$$;

create trigger messages_bump_conversation
  after insert on public.messages
  for each row execute function private.bump_conversation();

-- Execute rights ---------------------------------------------------------

revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
grant execute on all functions in schema public to service_role;
grant execute on function
  public.search_directory(text, double precision, double precision, timestamptz, uuid[], integer, double precision),
  public.accept_handoff(uuid),
  public.decline_handoff(uuid, text),
  public.owner_transition_job(uuid, public.job_state, text),
  public.review_content_draft(uuid, boolean)
to authenticated;
