# Architecture Overview

## Target topology

```text
External frontend repo / backend service
  -> Tracking API
  -> Validation + enrichment
  -> PostgreSQL / Supabase
  -> Router dispatcher
  -> Queue
  -> Delivery workers
  -> Meta / Google Ads / TikTok / Umami
```

## Primary components

### Tracking API

Responsible for:

- authenticating or trusting the caller boundary
- validating payload shape
- generating or preserving `event_id`
- enriching request metadata
- persisting the canonical record
- enqueueing delivery work after a successful write

### Database

Responsible for:

- canonical event storage
- uniqueness constraint on `event_id`
- auditability
- query support for replay and deletion workflows

### Router dispatcher

Responsible for:

- selecting destinations based on event type and configuration
- creating delivery jobs from stored event records
- keeping vendor routing policy outside the ingestion path

### Delivery workers

Responsible for:

- platform-specific transformation
- signed or authenticated outbound requests
- retry and backoff
- delivery status logging

## Design principles

- storage first
- async delivery second
- stable event identity everywhere
- internal schema separated from vendor schema
- observable failure states

## Deployment model

Recommended logical services:

- `tracking-api`
- `router-worker`
- `scheduler` or replay utility if needed later
- shared PostgreSQL and queue backend

## Related docs

- [Event flow](event-flow.md)
- [Service boundaries](service-boundaries.md)
- [ADR: queue-based routing](../10-adrs/adr-0003-queue-based-routing.md)
