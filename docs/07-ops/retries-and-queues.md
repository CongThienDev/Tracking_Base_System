# Retries and Queues

## Purpose

Protect ingestion from downstream instability and make delivery replay-safe.

## Queue model

- one canonical event may fan out to multiple destination jobs
- each destination job is independently retryable
- each job is keyed by `event_id` + destination

## Retry policy

Minimum:

- 3 attempts
- exponential backoff with jitter
- classify retryable vs permanent failures

## DLQ behavior

- move terminally failed jobs to a dead-letter queue or equivalent failed state
- make replay possible from canonical stored event data
- record final failure reason

## Idempotency

The worker must assume a job can be delivered more than once by queue mechanics and remain safe.

## Related docs

- [Router API](../04-api/router-api.md)
- [Runbooks](runbooks.md)
- [ADR: queue-based routing](../10-adrs/adr-0003-queue-based-routing.md)
