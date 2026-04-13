# ADR-0003: Queue-based Routing

## Status

Accepted

## Decision

Downstream routing is asynchronous and queue-based.

## Rationale

This protects ingestion latency, isolates vendor instability, and enables bounded retry and replay.

## Consequences

- delivery state is tracked separately from canonical event storage
- retry and DLQ behavior are mandatory
