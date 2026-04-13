-- Phase 1 ingestion schema

create extension if not exists pgcrypto;

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  event_name text not null,
  event_timestamp timestamptz not null,
  user_id text null,
  email_hash text null,
  anonymous_id text null,
  session_id text not null,
  source text null,
  campaign text null,
  ad_id text null,
  gclid text null,
  ttclid text null,
  customer_type text null,
  event_value numeric null,
  currency text null,
  payload jsonb not null default '{}'::jsonb,
  ingest_ip inet null,
  user_agent text null,
  route_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_event_id_key unique (event_id)
);

create table if not exists users (
  user_id text primary key,
  first_seen timestamptz not null,
  last_seen timestamptz not null,
  email_hash text null,
  total_value numeric not null default 0,
  purchase_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_events_event_name on events (event_name);
create index if not exists idx_events_event_timestamp on events (event_timestamp desc);
create index if not exists idx_events_user_id on events (user_id);
create index if not exists idx_events_session_id on events (session_id);
