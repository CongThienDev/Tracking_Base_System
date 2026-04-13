# Router API

## Purpose

Define the internal contract between stored events and delivery workers.

## Dispatcher responsibilities

- read new or pending canonical events
- determine enabled destinations
- create one delivery job per destination per event
- prevent duplicate delivery records for the same `event_id` and destination

## Worker input contract

```json
{
  "event_id": "uuid",
  "destination": "meta",
  "attempt": 1,
  "requested_at": "2026-04-13T10:00:05.000Z"
}
```

## Worker guarantees

- fetch canonical event by `event_id`
- map payload for exactly one destination
- update delivery status atomically where possible
- classify failures as retryable or terminal

## Replay behavior

Replays must be explicit, auditable, and idempotent.

## Related docs

- [Service boundaries](../02-architecture/service-boundaries.md)
- [Retries and queues](../07-ops/retries-and-queues.md)
