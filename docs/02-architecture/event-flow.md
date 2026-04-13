# Event Flow

## Browser-originated event

1. Frontend repo generates `event_id`, `session_id`, and event payload
2. Frontend repo calls `POST /track`
3. Tracking API validates JSON and required fields
4. Tracking API enriches IP, user-agent, and timestamp fallback
5. Tracking API normalizes the payload into canonical format
6. Tracking API persists the event row
7. Router dispatcher determines destinations
8. Delivery jobs are enqueued
9. Delivery workers transform and send vendor payloads
10. Delivery logs are written

## Backend-originated event

1. Backend service creates event payload with `event_id`
2. Backend calls `POST /track`
3. Remaining lifecycle matches browser event flow

## Duplicate event flow

1. Client sends an already-seen `event_id`
2. Tracking API checks unique constraint or idempotent insert result
3. API returns success-style idempotent response or explicit duplicate result based on implementation choice
4. No new queue jobs are created

## Vendor failure flow

1. Worker sends outbound request
2. Vendor returns transient error or times out
3. Worker records failure attempt
4. Queue retries up to policy limit
5. Final failure moves job to DLQ or failed status table
6. Stored event remains canonical and replayable

## Related docs

- [Sequence diagrams](sequence-diagrams.md)
- [Deduplication](../03-data/deduplication.md)
- [Retries and queues](../07-ops/retries-and-queues.md)
