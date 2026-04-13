# ADR-0004: Queue Technology Choice

## Status

Accepted

## Decision

For MVP, the queue stack is `BullMQ + Redis`.

## Context

The system needs asynchronous routing, retries, delayed jobs, and operationally simple setup for a Node.js and TypeScript codebase.

`BullMQ` is a queue library that runs on `Redis`. This decision compares:

- `BullMQ + Redis`
- `RabbitMQ` with custom consumer implementation

## Rationale

- fastest path to production for current stack
- built-in retry and backoff behavior suitable for MVP
- simpler implementation and operational overhead for current scope
- good fit for per-destination delivery jobs keyed by `event_id`

## Consequences

- Phase 2 implementation should scaffold workers and routing with `BullMQ + Redis`
- delivery idempotency and deduplication rules remain unchanged
- if future topology needs exceed this stack, migration can be revisited

## Re-evaluation triggers

- need for advanced broker routing topology (exchange and routing-key heavy patterns)
- multi-language consumer ecosystem that outgrows current queue ergonomics
- sustained throughput and operational constraints that favor broker-native features

## Related docs

- [ADR-0003: Queue-based routing](adr-0003-queue-based-routing.md)
- [Implementation phases](../12-roadmap/implementation-phases.md)
- [Retries and queues](../07-ops/retries-and-queues.md)
