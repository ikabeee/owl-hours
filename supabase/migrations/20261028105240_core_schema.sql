-- Zukki core schema (handoff section 6, "Data model").
-- Every row a business owns carries tenant_id; access rules live in the
-- next migration. Times are timestamptz (UTC); business-local time uses
-- tenants.timezone. Money is whole currency units, matching the zod
-- schemas in packages/shared.

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

-- Helpers that must never be reachable through the REST API.
create schema if not exists private;
revoke all on schema private from public;

create function private.geo_point(lat double precision, lng double precision)
returns extensions.geography
language sql immutable strict parallel safe
set search_path = ''
as $$
  select extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
$$;

create function private.is_valid_timezone(tz text)
returns boolean
language plpgsql immutable strict
set search_path = ''
as $$
begin
  perform now() at time zone tz;
  return true;
exception when invalid_parameter_value then
  return false;
end
$$;

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- Enums mirror packages/shared (job-states.ts, schemas.ts) and the handoff
-- state diagram. Add values with ALTER TYPE ... ADD VALUE.
create type public.tenant_role as enum ('owner', 'staff');
create type public.price_kind as enum ('callout', 'night_fee', 'repair_range');
create type public.urgency as enum ('now', 'today', 'week');
create type public.conversation_state as enum ('with_zukki', 'matched', 'offered', 'accepted', 'chatting');
create type public.handoff_status as enum ('offered', 'accepted', 'declined', 'expired', 'cancelled', 'closed');
create type public.message_sender as enum ('customer', 'zukki', 'owner');
create type public.delivery_status as enum ('received', 'queued', 'sent', 'delivered', 'read', 'failed');
create type public.media_kind as enum ('video', 'audio', 'image', 'document');
create type public.job_state as enum (
  'requested', 'triaged', 'proposed', 'owner_confirmed', 'customer_approved',
  'en_route', 'on_site', 'done', 'declined', 'cancelled'
);
create type public.job_actor as enum ('agent', 'owner', 'customer', 'system');
create type public.social_platform as enum ('facebook_page', 'instagram');
create type public.account_mode as enum ('live', 'test');
create type public.draft_status as enum ('draft', 'approved', 'published', 'rejected');
create type public.consent_kind as enum ('photos_for_marketing');

-- Businesses. Every column here is public directory data.
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,48}$'),
  name text not null check (char_length(name) between 1 and 120),
  category text not null check (category ~ '^[a-z_]{2,32}$'),
  timezone text not null default 'UTC' check (private.is_valid_timezone(timezone)),
  location extensions.geography(point, 4326) not null,
  logo_url text check (logo_url ~ '^https://'),
  website text check (website ~ '^https?://'),
  rating numeric(2, 1) check (rating between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  accepts_now boolean not null default false,
  night_jobs boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tenants_category_idx on public.tenants (category) where accepts_now;
create index tenants_location_gist on public.tenants using gist (location);

create table public.tenant_users (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.tenant_role not null default 'owner',
  display_name text not null check (char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index tenant_users_user_id_idx on public.tenant_users (user_id);

create table public.price_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  item text not null check (char_length(item) between 1 and 80),
  kind public.price_kind not null,
  min_amount integer not null check (min_amount >= 0),
  max_amount integer not null,
  currency char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  conditions text check (char_length(conditions) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_amount >= min_amount)
);
create index price_rules_tenant_id_idx on public.price_rules (tenant_id);

-- weekday follows extract(dow): 0 = Sunday. closes < opens means the
-- shift runs past midnight into the next day.
create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens time not null,
  closes time not null,
  check (opens <> closes)
);
create index business_hours_tenant_weekday_idx on public.business_hours (tenant_id, weekday);

create table public.service_areas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  center extensions.geography(point, 4326) not null,
  radius_km numeric(5, 2) not null check (radius_km > 0 and radius_km <= 200)
);
create index service_areas_tenant_id_idx on public.service_areas (tenant_id);
create index service_areas_center_gist on public.service_areas using gist (center);

-- Customers are shared across tenants (one WhatsApp number for everyone).
-- wa_id is a phone number: owners never get it (column grants, next file).
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  wa_id text not null unique check (wa_id ~ '^[0-9]{6,20}$'),
  display_name text check (char_length(display_name) <= 80),
  approx_area text check (char_length(approx_area) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  state public.conversation_state not null default 'with_zukki',
  category text check (category ~ '^[a-z_]{2,32}$'),
  urgency public.urgency,
  summary text check (char_length(summary) <= 2000),
  active_handoff_id uuid,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_customer_idx on public.conversations (customer_id, last_message_at desc);

-- Exact location, shown to a business only after the customer approves a
-- visit (product rule 7). Kept out of customers so RLS can hide whole rows.
create table public.customer_locations (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  location extensions.geography(point, 4326) not null,
  address text check (char_length(address) <= 300),
  shared_at timestamptz not null default now()
);
create index customer_locations_conversation_idx on public.customer_locations (conversation_id);

create table public.handoffs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  status public.handoff_status not null default 'offered',
  urgency public.urgency not null,
  attempt smallint not null check (attempt between 1 and 50),
  offered_at timestamptz not null default now(),
  expires_at timestamptz not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > offered_at),
  check ((status = 'offered') = (resolved_at is null)),
  unique (conversation_id, attempt),
  unique (id, tenant_id),
  unique (id, conversation_id)
);
-- One live handoff per conversation, enforced by the database.
create unique index handoffs_one_open_per_conversation
  on public.handoffs (conversation_id) where status in ('offered', 'accepted');
create index handoffs_tenant_status_idx on public.handoffs (tenant_id, status, offered_at desc);
create index handoffs_due_idx on public.handoffs (expires_at) where status = 'offered';

alter table public.conversations
  add constraint conversations_active_handoff_fk
  foreign key (active_handoff_id, id) references public.handoffs (id, conversation_id)
  on delete set null (active_handoff_id);
create index conversations_active_handoff_idx on public.conversations (active_handoff_id);

create table public.handoff_events (
  id bigint generated always as identity primary key,
  handoff_id uuid not null,
  tenant_id uuid not null,
  actor public.job_actor not null,
  actor_user_id uuid references auth.users (id) on delete set null,
  from_status public.handoff_status,
  to_status public.handoff_status not null,
  reason text check (char_length(reason) <= 500),
  at timestamptz not null default now(),
  foreign key (handoff_id, tenant_id) references public.handoffs (id, tenant_id) on delete cascade
);
create index handoff_events_handoff_idx on public.handoff_events (handoff_id, at);
create index handoff_events_tenant_idx on public.handoff_events (tenant_id, at desc);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  kind public.media_kind not null,
  storage_path text not null unique check (storage_path ~ '^conversations/[0-9a-f-]{36}/'),
  mime_type text not null check (mime_type ~ '^[a-z]+/[a-z0-9.+-]+$'),
  size_bytes bigint check (size_bytes between 0 and 104857600),
  wa_media_id text,
  -- Model outputs, written only by the pipeline from real runs.
  transcript text,
  sam_detections jsonb check (jsonb_typeof(sam_detections) = 'array'),
  signals jsonb check (jsonb_typeof(signals) = 'object'),
  created_at timestamptz not null default now()
);
create index media_conversation_idx on public.media (conversation_id, created_at);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  -- null while the customer is talking to Zukki; set once a business is in the chat.
  tenant_id uuid references public.tenants (id) on delete cascade,
  sender public.message_sender not null,
  author_user_id uuid references auth.users (id) on delete set null,
  body text check (char_length(body) <= 4096),
  polished boolean not null default false,
  media_id uuid references public.media (id) on delete set null,
  -- WhatsApp's id: unique so webhook retries insert once (ON CONFLICT DO NOTHING).
  wa_message_id text unique,
  delivery public.delivery_status not null default 'queued',
  created_at timestamptz not null default now(),
  check (body is not null or media_id is not null),
  check (sender <> 'owner' or (tenant_id is not null and author_user_id is not null)),
  check (not polished or sender = 'owner')
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_tenant_idx on public.messages (tenant_id, created_at desc) where tenant_id is not null;
create index messages_outbox_idx on public.messages (created_at) where delivery = 'queued';
create index messages_media_idx on public.messages (media_id) where media_id is not null;

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  handoff_id uuid not null,
  title text not null check (char_length(title) between 1 and 120),
  state public.job_state not null default 'requested',
  -- Validated against ticketSchema (packages/shared) before it is written.
  ticket jsonb check (jsonb_typeof(ticket) = 'object'),
  total_min integer check (total_min >= 0),
  total_max integer,
  currency char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  arrival_window text check (char_length(arrival_window) <= 40),
  technician_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_max >= total_min),
  unique (id, tenant_id),
  -- A job always belongs to the business its handoff went to.
  foreign key (handoff_id, tenant_id) references public.handoffs (id, tenant_id) on delete cascade
);
create index jobs_tenant_state_idx on public.jobs (tenant_id, state, updated_at desc);
create index jobs_conversation_idx on public.jobs (conversation_id);
create index jobs_handoff_idx on public.jobs (handoff_id);
create index jobs_technician_idx on public.jobs (technician_user_id) where technician_user_id is not null;

create table public.job_events (
  id bigint generated always as identity primary key,
  job_id uuid not null,
  tenant_id uuid not null,
  actor public.job_actor not null,
  actor_user_id uuid references auth.users (id) on delete set null,
  from_state public.job_state,
  to_state public.job_state not null,
  reason text check (char_length(reason) <= 500),
  at timestamptz not null default now(),
  foreign key (job_id, tenant_id) references public.jobs (id, tenant_id) on delete cascade
);
create index job_events_job_idx on public.job_events (job_id, at);
create index job_events_tenant_idx on public.job_events (tenant_id, at desc);

-- Page / Instagram links. The access token lives in Supabase Vault; this
-- row keeps only the vault secret id.
create table public.linked_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  platform public.social_platform not null,
  external_id text not null check (external_id ~ '^[0-9]{1,32}$'),
  display_name text check (char_length(display_name) <= 120),
  token_secret_id uuid,
  mode public.account_mode not null default 'test',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, platform, external_id)
);

create table public.content_drafts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  source_media_ids uuid[] not null default '{}',
  caption text not null check (char_length(caption) between 1 and 2200),
  image_path text,
  platforms public.social_platform[] not null check (cardinality(platforms) between 1 and 2),
  scheduled_at timestamptz,
  status public.draft_status not null default 'draft',
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Nothing is posted without the owner's approval (product rule 9).
  check (status = 'draft' or (reviewed_by is not null and reviewed_at is not null)),
  check ((status = 'published') = (published_at is not null))
);
create index content_drafts_tenant_idx on public.content_drafts (tenant_id, status, created_at desc);

-- Append-only: a revocation is a newer row with granted = false.
create table public.consents (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  kind public.consent_kind not null,
  granted boolean not null,
  source_message_id uuid references public.messages (id) on delete set null,
  at timestamptz not null default now()
);
create index consents_lookup_idx on public.consents (conversation_id, kind, at desc, id desc);

create table public.push_tokens (
  user_id uuid not null references auth.users (id) on delete cascade,
  expo_token text not null check (expo_token ~ '^Expo(nent)?PushToken\[.+\]$'),
  platform text not null check (platform in ('ios', 'android', 'web')),
  updated_at timestamptz not null default now(),
  primary key (user_id, expo_token)
);

create trigger tenants_touch before update on public.tenants
  for each row execute function private.touch_updated_at();
create trigger price_rules_touch before update on public.price_rules
  for each row execute function private.touch_updated_at();
create trigger customers_touch before update on public.customers
  for each row execute function private.touch_updated_at();
create trigger conversations_touch before update on public.conversations
  for each row execute function private.touch_updated_at();
create trigger jobs_touch before update on public.jobs
  for each row execute function private.touch_updated_at();
create trigger linked_accounts_touch before update on public.linked_accounts
  for each row execute function private.touch_updated_at();
create trigger content_drafts_touch before update on public.content_drafts
  for each row execute function private.touch_updated_at();
create trigger push_tokens_touch before update on public.push_tokens
  for each row execute function private.touch_updated_at();
