# Product Requirements

## Objective

Build a first-party tracking system that collects user events from frontend and backend systems, stores them in our own database as the source of truth, enriches and standardizes those events, and routes them to external ad and analytics platforms.

## Business goals

- preserve conversion data even when direct pixels fail
- improve data consistency across channels
- reduce double counting and attribution corruption
- provide one stable contract for all applications that emit events
- enable operational replay and auditability

## Functional requirements

### Ingestion

- expose `POST /track`
- accept JSON only
- require `event_name` and `session.session_id`
- accept optional client-supplied `event_id`
- auto-fill `event_id` if missing
- enrich IP, user-agent, and timestamp when available

### Processing

- normalize all incoming event shapes into one canonical contract
- compute derived fields such as `customer_type` and normalized monetary value
- reject malformed or spam-like events
- deduplicate before side effects

### Storage

- persist every accepted event before downstream routing
- store enough payload detail for auditing and replay
- support delete-by-user workflow for privacy requests

### Routing

- route events asynchronously after storage
- map to Meta Conversions API, Google Ads, and TikTok Events API
- preserve the same `event_id` across all supported downstream payloads
- retry transient failures with bounded attempts

### Logging and observability

- log incoming request metadata
- log validation failures
- log downstream success and failure
- record response summaries from vendor APIs where safe

## Non-functional requirements

- p95 ingestion response under 200 ms for nominal load
- support at least 100 events per second in MVP
- isolate external vendor instability from ingestion availability
- keep schema and payload contracts explicit and versionable

## Acceptance criteria

The system is acceptable when:

- events are received through `/track`
- canonical records are stored correctly
- deduplication prevents repeated inserts and sends
- Meta, Google Ads, and TikTok receive transformed events from stored records
- operational logs make failures diagnosable

## Related docs

- [Event taxonomy](event-taxonomy.md)
- [Identity and dedup](identity-and-dedup.md)
- [Architecture overview](../02-architecture/architecture-overview.md)
- [Tracking API](../04-api/tracking-api.md)
