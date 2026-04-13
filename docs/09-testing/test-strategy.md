# Test Strategy

## Goals

Prove that the system preserves identity, stores events correctly, and routes safely under retry and duplicate conditions.

## Test layers

### Unit tests

- payload normalization
- email hashing
- destination mapping
- retry classification
- customer type derivation

### Contract tests

- `/track` request validation
- success and error response shapes
- idempotent duplicate behavior

### Integration tests

- insert canonical event and create delivery records
- worker fetches stored event and calls mocked vendor endpoint
- delivery status transitions

### End-to-end tests

- frontend repo emits event with `event_id`
- service stores it
- worker forwards it with same `event_id`

### Load tests

- sustain 100+ events per second for MVP target
- verify latency and queue stability

## Required invariants to test

- one event keeps one `event_id`
- duplicate `event_id` does not create duplicate inserts or sends
- storage occurs before vendor delivery
- vendor failure does not erase canonical record

## Related docs

- [Contract tests](contract-tests.md)
- [Integration tests](integration-tests.md)
- [ADR: event ID standard](../10-adrs/adr-0001-event-id-standard.md)
