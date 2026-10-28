-- Closes the requirement gaps found when checking the schema against the
-- handoff: WhatsApp message kinds, option B polish drafts, a configurable
-- accept window and generic extra fees.

-- 1. Message kinds (handoff section 7). Interactive payloads, button and
--    list replies are stored as JSON. A shared location is stored in
--    customer_locations and referenced by id, so exact coordinates never
--    sit in messages that offered businesses can read (product rule 7).
create type public.message_kind as enum (
  'text', 'media', 'interactive', 'button_reply', 'list_reply', 'location', 'location_request'
);

alter table public.messages
  add column kind public.message_kind not null default 'text',
  add column payload jsonb;

update public.messages set kind = 'media' where media_id is not null and body is null;

do $$
declare
  old_check text;
begin
  select conname into old_check from pg_constraint
  where conrelid = 'public.messages'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) = 'CHECK (((body IS NOT NULL) OR (media_id IS NOT NULL)))';
  if old_check is not null then
    execute format('alter table public.messages drop constraint %I', old_check);
  end if;
end
$$;

alter table public.messages
  add constraint messages_has_content
    check (body is not null or media_id is not null or payload is not null),
  add constraint messages_payload_object
    check (payload is null or jsonb_typeof(payload) = 'object'),
  add constraint messages_payload_required
    check (kind in ('text', 'media') or payload is not null),
  add constraint messages_media_has_file
    check (kind <> 'media' or media_id is not null),
  add constraint messages_location_by_reference
    check (kind <> 'location' or (payload ? 'customer_location_id'
                                  and not (payload ?| array['latitude', 'longitude'])));

-- 2. Option B (product rule 5): the owner writes, Zukki proposes a clearer
--    version, the owner picks one. Only the pick becomes a message.
create type public.message_draft_status as enum ('pending', 'sent_original', 'sent_polished', 'discarded');

create table public.message_drafts (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  author_user_id uuid not null references auth.users (id) on delete cascade,
  original_body text not null check (char_length(original_body) between 1 and 4096),
  -- Written by the Platform API from Muse Spark; interactive bodies max 1024.
  polished_body text check (char_length(polished_body) between 1 and 1024),
  status public.message_draft_status not null default 'pending',
  sent_message_id uuid references public.messages (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check ((status = 'pending') = (resolved_at is null))
);
create index message_drafts_conversation_idx on public.message_drafts (conversation_id, created_at desc);
create index message_drafts_tenant_idx on public.message_drafts (tenant_id, status);
create index message_drafts_author_idx on public.message_drafts (author_user_id);
create index message_drafts_sent_message_idx on public.message_drafts (sent_message_id);

alter table public.message_drafts enable row level security;
grant select on public.message_drafts to authenticated;
grant insert (id, conversation_id, tenant_id, author_user_id, original_body) on public.message_drafts to authenticated;
grant all on public.message_drafts to service_role;

create policy message_drafts_select on public.message_drafts
  for select to authenticated using (tenant_id in (select private.user_tenant_ids()));
create policy message_drafts_insert on public.message_drafts
  for insert to authenticated
  with check (
    author_user_id = (select auth.uid())
    and tenant_id in (select private.user_tenant_ids())
    and private.can_chat(conversation_id, tenant_id)
  );

create function private.send_message_draft(p_draft_id uuid, p_use_polished boolean)
returns public.messages
language plpgsql security definer
set search_path = ''
as $$
declare
  d public.message_drafts;
  m public.messages;
begin
  select * into d from public.message_drafts where id = p_draft_id for update;
  if not found or d.author_user_id <> (select auth.uid()) then
    raise exception 'draft not found' using errcode = 'P0002';
  end if;
  if d.status <> 'pending' then
    raise exception 'draft is already %', d.status using errcode = '22023';
  end if;
  if p_use_polished and d.polished_body is null then
    raise exception 'Zukki''s version is not ready yet' using errcode = '22023';
  end if;
  if not private.can_chat(d.conversation_id, d.tenant_id) then
    raise exception 'this chat is no longer open to your business' using errcode = '22023';
  end if;

  insert into public.messages (conversation_id, tenant_id, sender, author_user_id, body, polished, kind, payload)
  values (
    d.conversation_id, d.tenant_id, 'owner', d.author_user_id,
    case when p_use_polished then d.polished_body else d.original_body end,
    p_use_polished,
    -- Polished replies go out as an interactive message with the
    -- "Written with Zukki, approved by ..." footer and reply buttons.
    case when p_use_polished then 'interactive'::public.message_kind else 'text'::public.message_kind end,
    case when p_use_polished then jsonb_build_object('variant', 'polished_reply') end
  )
  returning * into m;

  update public.message_drafts
  set status = case when p_use_polished then 'sent_polished'::public.message_draft_status
                    else 'sent_original'::public.message_draft_status end,
      sent_message_id = m.id,
      resolved_at = now()
  where id = d.id;
  return m;
end
$$;

create function public.send_message_draft(p_draft_id uuid, p_use_polished boolean)
returns public.messages
language sql security invoker
set search_path = ''
as $$
  select * from private.send_message_draft(p_draft_id, p_use_polished)
$$;

revoke all on function private.send_message_draft(uuid, boolean) from public, anon;
grant execute on function private.send_message_draft(uuid, boolean) to authenticated, service_role;
revoke all on function public.send_message_draft(uuid, boolean) from public, anon;
grant execute on function public.send_message_draft(uuid, boolean) to authenticated, service_role;

-- 3. Accept window (product rule 4: "defaults, configurable per platform").
--    One row; server-only.
create table public.platform_settings (
  id boolean primary key default true check (id),
  urgent_accept_window interval not null default interval '5 minutes'
    check (urgent_accept_window between interval '1 minute' and interval '2 hours'),
  normal_accept_window interval not null default interval '30 minutes'
    check (normal_accept_window between interval '1 minute' and interval '24 hours'),
  updated_at timestamptz not null default now()
);
insert into public.platform_settings default values;
alter table public.platform_settings enable row level security;
revoke all on public.platform_settings from anon, authenticated;
grant all on public.platform_settings to service_role;
create trigger platform_settings_touch before update on public.platform_settings
  for each row execute function private.touch_updated_at();

create or replace function public.create_handoff(
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
  s public.platform_settings;
begin
  select * into c from public.conversations where id = p_conversation_id for update;
  if not found then
    raise exception 'conversation % not found', p_conversation_id using errcode = 'P0002';
  end if;
  if c.urgency is null then
    raise exception 'conversation % has no urgency yet', p_conversation_id using errcode = '22023';
  end if;
  select * into s from public.platform_settings where id;

  insert into public.handoffs (conversation_id, tenant_id, urgency, attempt, offered_at, expires_at)
  values (
    c.id, p_tenant_id, c.urgency,
    coalesce((select max(attempt) from public.handoffs where conversation_id = c.id), 0) + 1,
    p_now,
    p_now + case c.urgency
      when 'now' then coalesce(s.urgent_accept_window, interval '5 minutes')
      else coalesce(s.normal_accept_window, interval '30 minutes')
    end
  )
  returning * into h;

  update public.conversations set state = 'offered', active_handoff_id = h.id where id = c.id;
  insert into public.handoff_events (handoff_id, tenant_id, actor, from_status, to_status, reason)
  values (h.id, h.tenant_id, 'system', null, 'offered', 'customer asked to connect');
  return h;
end
$$;

-- 4. Generic extra fees (parking, materials, weekend) beside the night fee.
alter type public.price_kind add value if not exists 'extra_fee';

-- Realtime for the polish screen (owner waits for Zukki's version).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.message_drafts;
  end if;
end
$$;
