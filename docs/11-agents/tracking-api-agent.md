# Tracking API Agent

## Scope

Work on request parsing, validation, normalization, metadata enrichment, and persistence handoff.

## Checklist

- preserve or generate `event_id`
- require `event_name` and `session.session_id`
- reject non-JSON
- enrich timestamp, IP, user-agent
- keep response shape stable
- never call vendor APIs directly from the hot path

## Read first

- [Tracking API](../04-api/tracking-api.md)
- [Event contract](../03-data/event-contract.md)
- [Deduplication](../03-data/deduplication.md)
