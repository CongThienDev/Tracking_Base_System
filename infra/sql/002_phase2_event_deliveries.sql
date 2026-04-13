-- Phase 2 routing state schema

create extension if not exists pgcrypto;

create table if not exists event_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  destination text not null,
  attempt_count integer not null default 0,
  status text not null default 'pending',
  last_error_code text null,
  last_error_message text null,
  last_response_summary jsonb null,
  next_attempt_at timestamptz null,
  delivered_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_deliveries_event_destination_key unique (event_id, destination)
);

comment on table event_deliveries is 'One routing state row per canonical event and destination.';
comment on column event_deliveries.status is 'Delivery state used by worker retry and replay logic.';
comment on column event_deliveries.next_attempt_at is 'Scheduled retry time for deferred delivery attempts.';
comment on column event_deliveries.last_response_summary is 'Compact vendor response or failure summary.';

create index if not exists idx_event_deliveries_status_next_attempt
  on event_deliveries (status, next_attempt_at);

create index if not exists idx_events_source
  on events (source);

create index if not exists idx_events_route_status
  on events (route_status);

create index if not exists idx_events_payload_gin
  on events using gin (payload);
