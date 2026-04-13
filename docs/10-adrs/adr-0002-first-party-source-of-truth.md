# ADR-0002: First-party Source of Truth

## Status

Accepted

## Decision

The internal database is the source of truth. External platforms are downstream consumers only.

## Rationale

Vendor-side data can be blocked, duplicated, delayed, or lost. Internal persistence must remain authoritative.

## Consequences

- store before send
- keep replayable canonical records
- do not make ingestion depend on vendor availability
