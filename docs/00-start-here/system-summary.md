# System Summary

## Mission

Build a first-party tracking backbone that receives events from web applications and backend services, stores them as canonical records, and only then forwards them to Meta, Google Ads, TikTok, and optional analytics sinks.

## Why this system exists

Direct browser pixels are operationally fragile.

Failure modes include:

- browser blocking and consent disruption
- accidental pixel removal during frontend releases
- vendor account issues
- inconsistent client-side event naming and payloads
- double counting due to missing deduplication

This service is the safety net. Even if a downstream pixel is lost or degraded, the system still owns the event record.

## Core principle

> One real-world event = one `event_id` = one stored record = one downstream conversion.

## High-level flow

```text
Frontend app or backend service
  -> POST /track
  -> Validation and enrichment
  -> Canonical persistence in PostgreSQL
  -> Async router and retry queue
  -> Meta / Google Ads / TikTok / Umami
```

## System boundaries

Included:

- event ingestion
- identity capture
- deduplication
- enrichment
- persistence
- async downstream routing
- operational logging and recovery

Excluded from MVP:

- multi-touch attribution
- BI dashboarding
- experimentation framework
- customer 360 profile engine

## Architectural stance

- internal database is authoritative
- downstream vendors are delivery targets only
- event identity must be stable across all layers
- ingestion latency matters more than immediate vendor delivery
- retries and replay must be safe

## Related docs

- [Scope and non-goals](scope-and-non-goals.md)
- [Requirements](../01-product/requirements.md)
- [Architecture overview](../02-architecture/architecture-overview.md)
- [ADR: source of truth](../10-adrs/adr-0002-first-party-source-of-truth.md)
