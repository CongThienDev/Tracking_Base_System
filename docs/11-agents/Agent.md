# Repository Agent Guide

## Mission

Implement this repository without violating source-of-truth, `event_id`, privacy, or idempotency guarantees.

## Source-of-truth hierarchy

1. `docs/03-data/event-contract.md`
2. `docs/03-data/deduplication.md`
3. `docs/04-api/tracking-api.md`
4. `docs/03-data/schema.md`
5. `docs/10-adrs/`

## Hard rules

- do not send vendor events before persistence
- do not break `event_id` propagation
- do not store raw PII unless the docs explicitly authorize it
- do not add hidden business logic in handlers
- do not bypass canonical storage for convenience

## Expected deliverables from an agent

- code aligned with the relevant docs
- tests covering critical invariants
- doc updates when contracts change
- explicit statement of assumptions if anything remains ambiguous
- daily progress update in `docs/12-roadmap/daily-progress.md` when work was done

## Definition of success

The implementation keeps ingestion fast, storage authoritative, routing async, and deduplication deterministic.

## Related docs

- [Root AGENT guide](../../AGENT.md)
- [Tracking API agent](tracking-api-agent.md)
- [Schema agent](schema-agent.md)
- [Implementation phases](../12-roadmap/implementation-phases.md)
- [Daily progress log](../12-roadmap/daily-progress.md)
