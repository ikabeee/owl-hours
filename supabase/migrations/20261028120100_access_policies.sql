-- Who can read and write what.
--
-- Roles: the Platform API and the WhatsApp orchestrator use service_role
-- (bypasses RLS; must scope by tenant in code). The owner app uses the
-- signed-in user's JWT (role authenticated), so these policies are the
-- tenant boundary. anon gets nothing.
--
-- Patterns (Supabase RLS performance guidance):
-- * auth.uid() and helper calls are wrapped in (select ...) so Postgres
--   evaluates them once per statement, not once per row.
-- * Membership lookups are SECURITY DEFINER helpers in the private schema
--   (not exposed over REST) with an empty search_path.
-- * One policy per command, always TO a role, never FOR ALL.
-- * Columns owners must not read or write are handled with column grants.

-- Membership helpers -------------------------------------------------------

create function private.user_tenant_ids()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select tu.tenant_id from public.tenant_users tu where tu.user_id = (select auth.uid())
$$;

create function private.user_owner_tenant_ids()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select tu.tenant_id from public.tenant_users tu
  where tu.user_id = (select auth.uid()) and tu.role = 'owner'
$$;

-- Conversations a business may see: offered to it (to judge the request),
-- accepted, or closed after the job. Declined and expired offers drop out.
create function private.visible_conversation_ids()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select distinct h.conversation_id from public.handoffs h
  where h.tenant_id in (select private.user_tenant_ids())
    and h.status in ('offered', 'accepted', 'closed')
$$;

create function private.visible_customer_ids()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select distinct c.customer_id from public.conversations c
  where c.id in (select private.visible_conversation_ids())
$$;

-- Exact address unlocks once the customer approved this business's visit.
create function private.approved_visit_conversation_ids()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select distinct j.conversation_id from public.jobs j
  where j.tenant_id in (select private.user_tenant_ids())
    and j.state in ('customer_approved', 'en_route', 'on_site', 'done')
$$;

create function private.can_chat(p_conversation_id uuid, p_tenant_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.handoffs h
    where h.conversation_id = p_conversation_id
      and h.tenant_id = p_tenant_id
      and h.status = 'accepted'
  )
$$;

revoke all on all functions in schema private from public, anon;
grant usage on schema private to authenticated, service_role;
grant execute on all functions in schema private to authenticated, service_role;

-- Baseline grants: start from nothing, then grant per table ------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

alter table public.tenants enable row level security;
alter table public.tenant_users enable row level security;
alter table public.price_rules enable row level security;
alter table public.business_hours enable row level security;
alter table public.service_areas enable row level security;
alter table public.customers enable row level security;
alter table public.conversations enable row level security;
alter table public.customer_locations enable row level security;
alter table public.handoffs enable row level security;
alter table public.handoff_events enable row level security;
alter table public.media enable row level security;
alter table public.messages enable row level security;
alter table public.jobs enable row level security;
alter table public.job_events enable row level security;
alter table public.linked_accounts enable row level security;
alter table public.content_drafts enable row level security;
alter table public.consents enable row level security;
alter table public.push_tokens enable row level security;

-- Directory (public business data, any signed-in user) -----------------

grant select on public.tenants to authenticated;
grant update (name, timezone, location, logo_url, website, accepts_now, night_jobs)
  on public.tenants to authenticated;

create policy tenants_select on public.tenants
  for select to authenticated using (true);
create policy tenants_update_owner on public.tenants
  for update to authenticated
  using (id in (select private.user_owner_tenant_ids()))
  with check (id in (select private.user_owner_tenant_ids()));

grant select, insert, update, delete on public.price_rules, public.business_hours, public.service_areas
  to authenticated;

create policy price_rules_select on public.price_rules
  for select to authenticated using (true);
create policy price_rules_insert on public.price_rules
  for insert to authenticated with check (tenant_id in (select private.user_owner_tenant_ids()));
create policy price_rules_update on public.price_rules
  for update to authenticated
  using (tenant_id in (select private.user_owner_tenant_ids()))
  with check (tenant_id in (select private.user_owner_tenant_ids()));
create policy price_rules_delete on public.price_rules
  for delete to authenticated using (tenant_id in (select private.user_owner_tenant_ids()));

create policy business_hours_select on public.business_hours
  for select to authenticated using (true);
create policy business_hours_insert on public.business_hours
  for insert to authenticated with check (tenant_id in (select private.user_owner_tenant_ids()));
create policy business_hours_update on public.business_hours
  for update to authenticated
  using (tenant_id in (select private.user_owner_tenant_ids()))
  with check (tenant_id in (select private.user_owner_tenant_ids()));
create policy business_hours_delete on public.business_hours
  for delete to authenticated using (tenant_id in (select private.user_owner_tenant_ids()));

create policy service_areas_select on public.service_areas
  for select to authenticated using (true);
create policy service_areas_insert on public.service_areas
  for insert to authenticated with check (tenant_id in (select private.user_owner_tenant_ids()));
create policy service_areas_update on public.service_areas
  for update to authenticated
  using (tenant_id in (select private.user_owner_tenant_ids()))
  with check (tenant_id in (select private.user_owner_tenant_ids()));
create policy service_areas_delete on public.service_areas
  for delete to authenticated using (tenant_id in (select private.user_owner_tenant_ids()));

-- Team ---------------------------------------------------------------

grant select on public.tenant_users to authenticated;
create policy tenant_users_select on public.tenant_users
  for select to authenticated using (tenant_id in (select private.user_tenant_ids()));

-- Customers and conversations (private to the businesses involved) -----

-- No wa_id (phone number) for owners.
grant select (id, display_name, approx_area, created_at) on public.customers to authenticated;
create policy customers_select on public.customers
  for select to authenticated using (id in (select private.visible_customer_ids()));

grant select on public.conversations to authenticated;
create policy conversations_select on public.conversations
  for select to authenticated using (id in (select private.visible_conversation_ids()));

grant select on public.customer_locations to authenticated;
create policy customer_locations_select on public.customer_locations
  for select to authenticated
  using (conversation_id in (select private.approved_visit_conversation_ids()));

grant select on public.media to authenticated;
create policy media_select on public.media
  for select to authenticated using (conversation_id in (select private.visible_conversation_ids()));

grant select on public.consents to authenticated;
create policy consents_select on public.consents
  for select to authenticated using (conversation_id in (select private.visible_conversation_ids()));

-- Messages: Zukki-phase evidence (tenant_id null) plus this business's own
-- chat. Another business's chat in the same conversation stays hidden.
grant select on public.messages to authenticated;
grant insert (conversation_id, tenant_id, sender, author_user_id, body) on public.messages to authenticated;

create policy messages_select on public.messages
  for select to authenticated
  using (
    tenant_id in (select private.user_tenant_ids())
    or (tenant_id is null and conversation_id in (select private.visible_conversation_ids()))
  );
-- Option A: the owner's text as written, queued for the orchestrator to
-- relay. Polished messages (option B) are written by the Platform API.
create policy messages_insert_owner on public.messages
  for insert to authenticated
  with check (
    sender = 'owner'
    and author_user_id = (select auth.uid())
    and tenant_id in (select private.user_tenant_ids())
    and private.can_chat(conversation_id, tenant_id)
  );

-- Handoffs and jobs: read here, change through the functions in the next
-- migration, which check the rules and write the audit row.
grant select on public.handoffs, public.handoff_events, public.jobs, public.job_events to authenticated;
grant update (arrival_window, technician_user_id) on public.jobs to authenticated;

create policy handoffs_select on public.handoffs
  for select to authenticated using (tenant_id in (select private.user_tenant_ids()));
create policy handoff_events_select on public.handoff_events
  for select to authenticated using (tenant_id in (select private.user_tenant_ids()));
create policy jobs_select on public.jobs
  for select to authenticated using (tenant_id in (select private.user_tenant_ids()));
create policy jobs_update on public.jobs
  for update to authenticated
  using (tenant_id in (select private.user_tenant_ids()))
  with check (tenant_id in (select private.user_tenant_ids()));
create policy job_events_select on public.job_events
  for select to authenticated using (tenant_id in (select private.user_tenant_ids()));

-- Linked accounts: owners see and unlink; linking (OAuth) is server-side.
grant select (id, tenant_id, platform, external_id, display_name, mode, created_at, updated_at)
  on public.linked_accounts to authenticated;
grant delete on public.linked_accounts to authenticated;

create policy linked_accounts_select on public.linked_accounts
  for select to authenticated using (tenant_id in (select private.user_tenant_ids()));
create policy linked_accounts_delete on public.linked_accounts
  for delete to authenticated using (tenant_id in (select private.user_owner_tenant_ids()));

-- Content drafts: owners edit drafts; approval goes through review_content_draft().
grant select on public.content_drafts to authenticated;
grant update (caption, platforms, scheduled_at) on public.content_drafts to authenticated;

create policy content_drafts_select on public.content_drafts
  for select to authenticated using (tenant_id in (select private.user_tenant_ids()));
create policy content_drafts_update on public.content_drafts
  for update to authenticated
  using (tenant_id in (select private.user_owner_tenant_ids()) and status = 'draft')
  with check (tenant_id in (select private.user_owner_tenant_ids()) and status = 'draft');

-- Push tokens: each user manages their own devices.
grant select, insert, update, delete on public.push_tokens to authenticated;

create policy push_tokens_select on public.push_tokens
  for select to authenticated using (user_id = (select auth.uid()));
create policy push_tokens_insert on public.push_tokens
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy push_tokens_update on public.push_tokens
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy push_tokens_delete on public.push_tokens
  for delete to authenticated using (user_id = (select auth.uid()));
