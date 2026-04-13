# Server-side Tracking

## Purpose

Allow backend services in other repositories to emit canonical events directly to `/track`.

## Use cases

- payment-confirmed purchase events
- server-side subscription renewals
- backend-generated fulfillment or lead qualification milestones

## Rules

- backend callers should generate `event_id` when possible
- backend calls must still include `session_id` if the event belongs to a user session context
- do not bypass the tracking API to insert directly into the database unless a controlled ingestion path is explicitly designed later

## Related docs

- [Tracking API](../04-api/tracking-api.md)
- [Deduplication](../03-data/deduplication.md)
