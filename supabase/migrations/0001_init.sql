-- Zukki initial schema (handoff section 6, data model minimum).
-- Exact address stays null until the customer approves (location privacy).

create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone_number_id text not null,
  logo_url text,
  area text not null,
  night_hours text not null,
  accepts_night_jobs boolean not null default true
);

create table price_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id),
  item text not null,
  kind text not null check (kind in ('callout', 'night_fee', 'repair_range')),
  min_cents integer not null,
  max_cents integer not null,
  notes text
);

create table technicians (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id),
  name text not null,
  van_stock jsonb not null default '{}',
  last_location jsonb,
  status text not null default 'off_duty'
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  wa_id text unique not null,
  display_name text not null,
  approx_location text,
  exact_address text
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id),
  customer_id uuid not null references customers (id),
  technician_id uuid references technicians (id),
  state text not null default 'requested',
  urgency text not null default 'now' check (urgency in ('now', 'today', 'week')),
  category text,
  title text,
  diagnosis text,
  quote jsonb,
  arrival_window text,
  created_at timestamptz not null default now()
);

create table job_evidence (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id),
  media_id text not null,
  kind text not null check (kind in ('video', 'voice', 'photo', 'frame')),
  transcript text,
  sam_detections jsonb,
  signals jsonb
);

create table job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id),
  actor text not null check (actor in ('agent', 'owner', 'customer', 'system')),
  type text not null,
  payload jsonb,
  at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id),
  direction text not null check (direction in ('in', 'out')),
  wa_message_id text,
  type text not null,
  body text,
  at timestamptz not null default now()
);

create table consents (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id),
  kind text not null,
  granted boolean not null,
  at timestamptz not null default now()
);
