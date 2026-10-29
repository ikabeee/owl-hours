-- Aligns the schema with the contracts already in the repo:
-- handoff-ui/whatsapp/payloads (01-15) and apps/owner/shared/data/types.ts.

-- Business fields the suggestion card (payload 07), the polished footer
-- (payload 12, <= 60 chars) and the owner Business type need.
alter table public.tenants
  add column short_name text check (char_length(short_name) between 1 and 28),
  add column eta_minutes smallint check (eta_minutes between 5 and 240),
  add column urgent_accept_window interval
    check (urgent_accept_window between interval '1 minute' and interval '2 hours'),
  add column normal_accept_window interval
    check (normal_accept_window between interval '1 minute' and interval '24 hours');
update public.tenants set short_name = left(split_part(name, ' ', 1), 28) where short_name is null;
alter table public.tenants alter column short_name set not null;
grant update (short_name, eta_minutes, urgent_accept_window, normal_accept_window) on public.tenants to authenticated;

alter table public.tenant_users
  add column phone text check (phone ~ '^\+[1-9][0-9]{6,14}$');

-- Technicians may not have app accounts ("Mario R." on the quote).
create table public.technicians (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  user_id uuid references auth.users (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, tenant_id)
);
create index technicians_tenant_idx on public.technicians (tenant_id);
create index technicians_user_idx on public.technicians (user_id);
alter table public.technicians enable row level security;
grant select, insert, update, delete on public.technicians to authenticated;
grant all on public.technicians to service_role;
create policy technicians_select on public.technicians
  for select to authenticated using (tenant_id in (select private.user_tenant_ids()));
create policy technicians_insert on public.technicians
  for insert to authenticated with check (tenant_id in (select private.user_owner_tenant_ids()));
create policy technicians_update on public.technicians
  for update to authenticated
  using (tenant_id in (select private.user_owner_tenant_ids()))
  with check (tenant_id in (select private.user_owner_tenant_ids()));
create policy technicians_delete on public.technicians
  for delete to authenticated using (tenant_id in (select private.user_owner_tenant_ids()));

drop index public.jobs_technician_idx;
alter table public.jobs drop column technician_user_id;
alter table public.jobs
  add column technician_id uuid,
  add column final_total integer check (final_total >= 0),
  add constraint jobs_technician_fk foreign key (technician_id, tenant_id)
    references public.technicians (id, tenant_id) on delete set null (technician_id);
create index jobs_technician_idx on public.jobs (technician_id, tenant_id);
grant update (technician_id, final_total) on public.jobs to authenticated;

-- "at cost" extra fees (owner ExtraFee.amount).
alter table public.price_rules
  add column at_cost boolean not null default false,
  add constraint price_rules_at_cost_extra_fee
    check (not at_cost or (kind = 'extra_fee' and min_amount = 0 and max_amount = 0));

-- Offer card fields (RequestOffer): title, distance, suggested quote,
-- decline reasons.
alter table public.conversations
  add column title text check (char_length(title) between 1 and 120);

create type public.decline_reason as enum ('busy', 'too_far', 'not_offered', 'other');
alter table public.handoffs
  add column distance_km numeric(6, 1) check (distance_km >= 0),
  add column suggested_min integer check (suggested_min >= 0),
  add column suggested_max integer,
  add column decline_reason public.decline_reason,
  add constraint handoffs_suggested_range check (suggested_max >= suggested_min),
  add constraint handoffs_decline_reason_only_declined check (decline_reason is null or status = 'declined');

-- Media roles: the marked frame, thumbnails and before/after job photos.
create type public.media_role as enum ('evidence', 'marked_frame', 'before_photo', 'after_photo', 'job_photo');
alter table public.media
  add column role public.media_role not null default 'evidence',
  add column thumb_path text,
  add column duration_ms integer check (duration_ms between 0 and 600000),
  add column derived_from_media_id uuid references public.media (id) on delete set null,
  add constraint media_marked_frame_has_source check (role <> 'marked_frame' or derived_from_media_id is not null);
create index media_derived_idx on public.media (derived_from_media_id);

-- Polish preview language (PolishPreview.language), written by the API.
alter table public.message_drafts
  add column language text check (language ~ '^[a-z]{2,3}(-[A-Z]{2})?$');

-- Unread counts (Conversation.unread): one read marker per user.
create table public.conversation_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, conversation_id)
);
create index conversation_reads_conversation_idx on public.conversation_reads (conversation_id);
alter table public.conversation_reads enable row level security;
grant select, insert (user_id, conversation_id, last_read_at), update (last_read_at)
  on public.conversation_reads to authenticated;
grant all on public.conversation_reads to service_role;
create policy conversation_reads_select on public.conversation_reads
  for select to authenticated using (user_id = (select auth.uid()));
create policy conversation_reads_insert on public.conversation_reads
  for insert to authenticated
  with check (user_id = (select auth.uid()) and conversation_id in (select private.visible_conversation_ids()));
create policy conversation_reads_update on public.conversation_reads
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and conversation_id in (select private.visible_conversation_ids()));

-- Consent asked but not answered yet (Job.shareConsent = "asked").
alter table public.consents alter column granted drop not null;
comment on column public.consents.granted is 'null = asked, no answer yet; the latest row wins';

-- Post drafts (PostDraft): label, source and the job they came from.
create type public.draft_source as enum ('job', 'prices', 'reminder');
alter table public.content_drafts
  add column title text check (char_length(title) between 1 and 80),
  add column source public.draft_source not null default 'prices',
  add column source_job_id uuid,
  add constraint content_drafts_source_job_fk foreign key (source_job_id, tenant_id)
    references public.jobs (id, tenant_id) on delete set null (source_job_id),
  add constraint content_drafts_job_source check (source <> 'job' or source_job_id is not null);
create index content_drafts_source_job_idx on public.content_drafts (source_job_id, tenant_id);
grant update (title) on public.content_drafts to authenticated;

-- Quotes (payload 13): the customer's "Approve visit" button carries the
-- quote id, so only the quote they saw can be approved.
create type public.quote_status as enum ('sent', 'approved', 'superseded', 'declined');
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null,
  tenant_id uuid not null,
  lines jsonb not null check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) between 1 and 12),
  total_min integer not null check (total_min >= 0),
  total_max integer not null,
  currency char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  arrival_from timestamptz not null,
  arrival_to timestamptz not null,
  technician_id uuid,
  note text check (char_length(note) <= 500),
  status public.quote_status not null default 'sent',
  sent_by uuid references auth.users (id) on delete set null,
  sent_at timestamptz not null default now(),
  decided_at timestamptz,
  check (total_max >= total_min),
  check (arrival_to >= arrival_from),
  check ((status = 'sent') = (decided_at is null)),
  foreign key (job_id, tenant_id) references public.jobs (id, tenant_id) on delete cascade,
  foreign key (technician_id, tenant_id) references public.technicians (id, tenant_id) on delete set null (technician_id)
);
create unique index quotes_one_open_per_job on public.quotes (job_id) where status = 'sent';
create index quotes_job_idx on public.quotes (job_id, tenant_id, sent_at desc);
create index quotes_technician_idx on public.quotes (technician_id, tenant_id);
create index quotes_sent_by_idx on public.quotes (sent_by);
alter table public.quotes enable row level security;
grant select on public.quotes to authenticated;
grant all on public.quotes to service_role;
create policy quotes_select on public.quotes
  for select to authenticated using (tenant_id in (select private.user_tenant_ids()));

create function private.send_quote(
  p_job_id uuid,
  p_lines jsonb,
  p_arrival_from timestamptz,
  p_arrival_to timestamptz,
  p_technician_id uuid default null,
  p_note text default null
)
returns public.quotes
language plpgsql security definer
set search_path = ''
as $$
declare
  j public.jobs;
  q public.quotes;
  tz text;
  invalid_lines integer;
  v_min integer;
  v_max integer;
begin
  select * into j from public.jobs where id = p_job_id for update;
  if not found or j.tenant_id not in (select private.user_tenant_ids()) then
    raise exception 'job not found' using errcode = 'P0002';
  end if;
  if j.state not in ('proposed', 'owner_confirmed') then
    raise exception 'a quote can only be sent before the customer approves (job is %)', j.state using errcode = '22023';
  end if;
  if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) not between 1 and 12 then
    raise exception 'a quote needs 1-12 lines' using errcode = '22023';
  end if;

  select count(*) into invalid_lines
  from jsonb_array_elements(p_lines) as e(line)
  where case
    when jsonb_typeof(e.line) <> 'object' then true
    when coalesce(jsonb_typeof(e.line -> 'label'), '') <> 'string'
      or coalesce(jsonb_typeof(e.line -> 'min'), '') <> 'number'
      or coalesce(jsonb_typeof(e.line -> 'max'), '') <> 'number' then true
    else char_length(e.line ->> 'label') not between 1 and 60
      or (e.line ->> 'min')::numeric < 0
      or (e.line ->> 'max')::numeric < (e.line ->> 'min')::numeric
      or (e.line ->> 'min')::numeric % 1 <> 0
      or (e.line ->> 'max')::numeric % 1 <> 0
  end;
  if invalid_lines > 0 then
    raise exception 'each line needs a label and whole amounts with min <= max' using errcode = '22023';
  end if;
  if p_arrival_to < p_arrival_from then
    raise exception 'arrival window ends before it starts' using errcode = '22023';
  end if;

  -- Totals are always the sum of the lines (packages/shared quoteSchema).
  select sum((e.line ->> 'min')::integer), sum((e.line ->> 'max')::integer) into v_min, v_max
  from jsonb_array_elements(p_lines) as e(line);

  update public.quotes set status = 'superseded', decided_at = now()
  where job_id = j.id and status = 'sent';

  insert into public.quotes (job_id, tenant_id, lines, total_min, total_max, currency, arrival_from, arrival_to,
                             technician_id, note, sent_by)
  values (j.id, j.tenant_id, p_lines, v_min, v_max, j.currency, p_arrival_from, p_arrival_to,
          coalesce(p_technician_id, j.technician_id), p_note, (select auth.uid()))
  returning * into q;

  select t.timezone into tz from public.tenants t where t.id = j.tenant_id;
  update public.jobs
  set state = 'owner_confirmed',
      total_min = v_min,
      total_max = v_max,
      technician_id = q.technician_id,
      arrival_window = to_char(p_arrival_from at time zone tz, 'FMHH12:MI') || '–'
                       || to_char(p_arrival_to at time zone tz, 'FMHH12:MI AM')
  where id = j.id;
  if j.state = 'proposed' then
    insert into public.job_events (job_id, tenant_id, actor, actor_user_id, from_state, to_state, reason)
    values (j.id, j.tenant_id, 'owner', (select auth.uid()), 'proposed', 'owner_confirmed', 'quote ' || q.id || ' sent');
  end if;
  return q;
end
$$;

create function public.send_quote(
  p_job_id uuid,
  p_lines jsonb,
  p_arrival_from timestamptz,
  p_arrival_to timestamptz,
  p_technician_id uuid default null,
  p_note text default null
)
returns public.quotes
language sql security invoker
set search_path = ''
as $$
  select * from private.send_quote(p_job_id, p_lines, p_arrival_from, p_arrival_to, p_technician_id, p_note)
$$;

-- The WhatsApp "Approve visit" button (quote_approve:<id>), server only.
-- Locks the job before the quote, like send_quote, so the two never deadlock.
create function public.approve_quote(p_quote_id uuid)
returns public.quotes
language plpgsql security invoker
set search_path = ''
as $$
declare
  v_job_id uuid;
  j public.jobs;
  q public.quotes;
begin
  select job_id into v_job_id from public.quotes where id = p_quote_id;
  if not found then
    raise exception 'quote not found' using errcode = 'P0002';
  end if;
  select * into j from public.jobs where id = v_job_id for update;
  select * into q from public.quotes where id = p_quote_id for update;
  if q.status <> 'sent' then
    raise exception 'quote is %', q.status using errcode = '22023';
  end if;
  if j.state <> 'owner_confirmed' then
    raise exception 'job is %', j.state using errcode = '22023';
  end if;

  update public.quotes set status = 'approved', decided_at = now() where id = q.id returning * into q;
  update public.jobs set state = 'customer_approved' where id = j.id;
  insert into public.job_events (job_id, tenant_id, actor, from_state, to_state, reason)
  values (j.id, j.tenant_id, 'customer', 'owner_confirmed', 'customer_approved', 'approved quote ' || q.id);
  return q;
end
$$;

revoke all on function private.send_quote(uuid, jsonb, timestamptz, timestamptz, uuid, text) from public, anon;
grant execute on function private.send_quote(uuid, jsonb, timestamptz, timestamptz, uuid, text) to authenticated, service_role;
revoke all on function public.send_quote(uuid, jsonb, timestamptz, timestamptz, uuid, text) from public, anon;
grant execute on function public.send_quote(uuid, jsonb, timestamptz, timestamptz, uuid, text) to authenticated, service_role;
revoke all on function public.approve_quote(uuid) from public, anon, authenticated;
grant execute on function public.approve_quote(uuid) to service_role;

-- create_handoff: business window override, distance and suggested quote.
drop function public.create_handoff(uuid, uuid, timestamptz);
create function public.create_handoff(
  p_conversation_id uuid,
  p_tenant_id uuid,
  p_suggested_min integer default null,
  p_suggested_max integer default null,
  p_now timestamptz default now()
)
returns public.handoffs
language plpgsql security definer
set search_path = ''
as $$
declare
  c public.conversations;
  t public.tenants;
  s public.platform_settings;
  h public.handoffs;
  v_distance numeric;
begin
  select * into c from public.conversations where id = p_conversation_id for update;
  if not found then
    raise exception 'conversation % not found', p_conversation_id using errcode = 'P0002';
  end if;
  if c.urgency is null then
    raise exception 'conversation % has no urgency yet', p_conversation_id using errcode = '22023';
  end if;
  select * into t from public.tenants where id = p_tenant_id;
  if not found then
    raise exception 'business % not found', p_tenant_id using errcode = 'P0002';
  end if;
  select * into s from public.platform_settings where id;
  select round((extensions.st_distance(t.location, l.location) / 1000)::numeric, 1) into v_distance
  from public.customer_locations l
  where l.conversation_id = c.id
  order by l.shared_at desc
  limit 1;

  insert into public.handoffs (conversation_id, tenant_id, urgency, attempt, offered_at, expires_at,
                               distance_km, suggested_min, suggested_max)
  values (
    c.id, t.id, c.urgency,
    coalesce((select max(attempt) from public.handoffs where conversation_id = c.id), 0) + 1,
    p_now,
    p_now + case c.urgency
      when 'now' then coalesce(t.urgent_accept_window, s.urgent_accept_window, interval '5 minutes')
      else coalesce(t.normal_accept_window, s.normal_accept_window, interval '30 minutes')
    end,
    v_distance, p_suggested_min, p_suggested_max
  )
  returning * into h;

  update public.conversations set state = 'offered', active_handoff_id = h.id where id = c.id;
  insert into public.handoff_events (handoff_id, tenant_id, actor, from_status, to_status, reason)
  values (h.id, h.tenant_id, 'system', null, 'offered', 'customer asked to connect');
  return h;
end
$$;
revoke all on function public.create_handoff(uuid, uuid, integer, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.create_handoff(uuid, uuid, integer, integer, timestamptz) to service_role;

-- decline_handoff: reason codes from the owner's decline sheet.
drop function public.decline_handoff(uuid, text);
drop function private.decline_handoff(uuid, text);
create function private.decline_handoff(
  p_handoff_id uuid,
  p_reason public.decline_reason default 'other',
  p_note text default null
)
returns public.handoffs
language plpgsql security definer
set search_path = ''
as $$
declare
  h public.handoffs := private.lock_own_handoff(p_handoff_id);
  declined public.handoffs;
begin
  if h.status <> 'offered' then
    raise exception 'handoff is already %', h.status using errcode = '22023';
  end if;
  if char_length(p_note) > 500 then
    raise exception 'note is too long' using errcode = '22023';
  end if;
  perform private.resolve_handoff(h, 'declined', 'owner', coalesce(p_reason::text || ': ' || p_note, p_reason::text));
  update public.handoffs set decline_reason = p_reason where id = h.id returning * into declined;
  return declined;
end
$$;
create function public.decline_handoff(
  p_handoff_id uuid,
  p_reason public.decline_reason default 'other',
  p_note text default null
)
returns public.handoffs
language sql security invoker
set search_path = ''
as $$
  select * from private.decline_handoff(p_handoff_id, p_reason, p_note)
$$;
revoke all on function private.decline_handoff(uuid, public.decline_reason, text) from public, anon;
grant execute on function private.decline_handoff(uuid, public.decline_reason, text) to authenticated, service_role;
revoke all on function public.decline_handoff(uuid, public.decline_reason, text) from public, anon;
grant execute on function public.decline_handoff(uuid, public.decline_reason, text) to authenticated, service_role;

-- Directory: ETA and short name for the card; the agent's search skips
-- businesses this conversation already saw (payload 09 "another option").
drop function public.search_directory_for_conversation(uuid, text, uuid[], timestamptz, integer);
drop function public.search_directory(text, double precision, double precision, timestamptz, uuid[], integer, double precision);

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
  short_name text,
  rating numeric,
  review_count integer,
  night_jobs boolean,
  open_now boolean,
  eta_minutes smallint,
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
  select c.id, c.slug, c.name, c.short_name, c.rating, c.review_count, c.night_jobs, c.is_open_now,
         c.eta_minutes, round((c.meters / 1000)::numeric, 1)
  from candidates c
  where c.is_open_now or c.night_jobs
  order by c.meters, c.rating desc nulls last
  limit greatest(1, least(coalesce(p_limit, 3), 10))
$$;

create function public.search_directory_for_conversation(
  p_conversation_id uuid,
  p_category text,
  p_exclude uuid[] default '{}',
  p_at timestamptz default now(),
  p_limit integer default 3
)
returns table (
  tenant_id uuid,
  slug text,
  name text,
  short_name text,
  rating numeric,
  review_count integer,
  night_jobs boolean,
  open_now boolean,
  eta_minutes smallint,
  distance_km numeric
)
language plpgsql stable security invoker
set search_path = ''
as $$
declare
  v_lat double precision;
  v_lng double precision;
  v_exclude uuid[];
begin
  select extensions.st_y(l.location::extensions.geometry), extensions.st_x(l.location::extensions.geometry)
  into v_lat, v_lng
  from public.customer_locations l
  where l.conversation_id = p_conversation_id
  order by l.shared_at desc
  limit 1;
  if not found then
    raise exception 'customer has not shared a location' using errcode = 'P0002';
  end if;

  v_exclude := coalesce(p_exclude, '{}') || array(
    select h.tenant_id from public.handoffs h where h.conversation_id = p_conversation_id
    union
    select (m.payload ->> 'business_id')::uuid from public.messages m
    where m.conversation_id = p_conversation_id
      and m.payload ->> 'variant' = 'suggest_business'
      and m.payload ->> 'business_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );
  return query select * from public.search_directory(p_category, v_lat, v_lng, p_at, v_exclude, p_limit);
end
$$;

revoke all on function public.search_directory(text, double precision, double precision, timestamptz, uuid[], integer, double precision)
  from public, anon;
grant execute on function public.search_directory(text, double precision, double precision, timestamptz, uuid[], integer, double precision)
  to authenticated, service_role;
revoke all on function public.search_directory_for_conversation(uuid, text, uuid[], timestamptz, integer)
  from public, anon, authenticated;
grant execute on function public.search_directory_for_conversation(uuid, text, uuid[], timestamptz, integer)
  to service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.quotes;
  end if;
end
$$;
