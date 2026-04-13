# ADR-0001: Event ID Standard

## Status

Accepted

## Decision

Every tracked event must carry one stable `event_id` from source to downstream delivery.

## Rationale

This is required for:

- internal deduplication
- Meta browser and server deduplication
- replay safety
- auditability

## Consequences

- clients should generate `event_id` whenever possible
- API generates one only if missing
- workers never regenerate IDs
