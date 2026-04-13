# Database Schema

## Goals

The schema must support:

- high write throughput
- strict event identity uniqueness
- replay and audit workflows
- privacy deletion workflows
- efficient analytics-oriented filtering on key fields

## Core tables

### `events`

```sql
create table events (
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
```

### `users`

```sql
create table users (
  user_id text primary key,
  first_seen timestamptz not null,
  last_seen timestamptz not null,
  email_hash text null,
  total_value numeric not null default 0,
  purchase_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `event_deliveries`

```sql
create table event_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  destination text not null,
  attempt_count integer not null default 0,
  status text not null,
  last_error_code text null,
  last_error_message text null,
  last_response_summary jsonb null,
  next_attempt_at timestamptz null,
  delivered_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_deliveries_event_destination_key unique (event_id, destination)
);
```

## Indexes

```sql
create index idx_events_event_name on events (event_name);
create index idx_events_event_timestamp on events (event_timestamp desc);
create index idx_events_user_id on events (user_id);
create index idx_events_session_id on events (session_id);
create index idx_events_source on events (source);
create index idx_events_route_status on events (route_status);
create index idx_events_payload_gin on events using gin (payload);
create index idx_event_deliveries_status_next_attempt on event_deliveries (status, next_attempt_at);
```

## Notes

- `event_id` uniqueness is the primary dedup barrier
- `payload` preserves flexible event-specific shape without schema drift for core fields
- `event_deliveries` isolates routing state from canonical event storage
- consider monthly partitioning on `event_timestamp` once volume justifies it

## Related docs

- [Event contract](event-contract.md)
- [Deduplication](deduplication.md)
- [Retention and deletion](retention-and-deletion.md)
