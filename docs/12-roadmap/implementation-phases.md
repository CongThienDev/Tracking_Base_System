# Implementation Phases

## Purpose

This file defines execution phases so progress is easy to control and review.

## Phase model

Each phase has:

- objective
- deliverables
- exit criteria
- status

Allowed status values:

- `not_started`
- `in_progress`
- `blocked`
- `review`
- `done`

## Locked technical decisions

- Queue technology for MVP: `BullMQ + Redis`
- Decision scope: Phase 2 implementation baseline
- Re-evaluation trigger: sustained complexity that requires broker-native routing topology or multi-language consumer patterns
- Decision record: [ADR-0004: Queue technology choice](../10-adrs/adr-0004-queue-technology-choice.md)

## Phase 0: Foundation Freeze

- Status: `done`
- Objective: lock docs baseline and execution rules.
- Deliverables:
- confirm core invariants (`event_id`, store-before-send, dedup, privacy)
- confirm scope and non-goals
- create working issue list per phase
- Exit criteria:
- baseline docs accepted and stable for implementation start

## Phase 1: Ingestion Core

- Status: `done`
- Objective: receive and persist canonical events.
- Deliverables:
- `POST /track`
- validation and enrichment (timestamp, IP, user-agent)
- generate or preserve `event_id`
- unique insert with idempotent duplicate behavior
- Exit criteria:
- duplicate `event_id` request does not create a second row

## Phase 2: Async Routing Skeleton

- Status: `not_started`
- Objective: route outside the ingestion hot path.
- Deliverables:
- queue and worker skeleton using `BullMQ + Redis`
- `event_deliveries` state handling
- retry policy with at least 3 attempts
- mock destination adapter
- Exit criteria:
- ingestion success is independent of vendor availability

## Phase 3: Meta Integration

- Status: `not_started`
- Objective: first real downstream integration.
- Deliverables:
- Meta mapper and client
- include stable `event_id`, hashed email, IP, user-agent
- integration tests for Meta payload shape
- Exit criteria:
- one canonical event routes correctly to Meta with stable identity

## Phase 4: TikTok and Google Integrations

- Status: `not_started`
- Objective: complete MVP downstream coverage.
- Deliverables:
- TikTok adapter
- Google conversion adapter with `gclid` handling
- destination-specific retries and failure logging
- Exit criteria:
- all required destinations process stored events correctly

## Phase 5: Frontend and Server Client Contract

- Status: `not_started`
- Objective: make integration from other repos reliable.
- Deliverables:
- lightweight tracking SDK or snippet contract
- auto `page_view`
- `session_id` lifecycle rules
- same `event_id` propagation to API and browser pixel when used
- Exit criteria:
- reference client can send events end-to-end successfully

## Phase 6: Ops and Security Hardening

- Status: `not_started`
- Objective: production readiness.
- Deliverables:
- observability baseline (logs, metrics, alerts)
- runbooks for incident handling
- request auth/signing and rate limiting policy
- delete-by-user flow validation
- Exit criteria:
- service is operable with clear failure recovery steps

## Phase 7: UAT and Cutover

- Status: `not_started`
- Objective: controlled production adoption.
- Deliverables:
- canary rollout plan
- parity checks against previous tracking path
- rollback strategy
- Exit criteria:
- rollout accepted with stable conversion integrity

## Review gate (mandatory)

At phase end, run a short gate review and capture:

- what was shipped
- proof (tests, logs, screenshots if needed)
- open risks
- phase status transition

## Daily update rule

Every working day with project activity must add one entry in:

- [Daily progress log](daily-progress.md)

## Related docs

- [Backlog](backlog.md)
- [Future extensions](future-extensions.md)
- [Root AGENT guide](../../AGENT.md)
