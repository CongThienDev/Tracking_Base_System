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

- Status: `done`
- Objective: route outside the ingestion hot path.
- Deliverables:
- queue and worker skeleton using `BullMQ + Redis`
- `event_deliveries` state handling
- retry policy with at least 3 attempts
- mock destination adapter
- Exit criteria:
- ingestion success is independent of vendor availability

## Phase 3: Meta Integration

- Status: `done`
- Objective: first real downstream integration.
- Deliverables:
- Meta mapper and client
- include stable `event_id`, hashed email, IP, user-agent
- integration tests for Meta payload shape
- Exit criteria:
- one canonical event routes correctly to Meta with stable identity

## Phase 4: TikTok and Google Integrations

- Status: `done`
- Objective: complete MVP downstream coverage.
- Deliverables:
- TikTok adapter
- Google conversion adapter with `gclid` handling
- destination-specific retries and failure logging
- Exit criteria:
- all required destinations process stored events correctly

## Phase 5: Frontend and Server Client Contract

- Status: `done`
- Objective: make integration from other repos reliable.
- Deliverables:
- lightweight tracking SDK or snippet contract
- auto `page_view`
- `session_id` lifecycle rules
- same `event_id` propagation to API and browser pixel when used
- Exit criteria:
- reference client can send events end-to-end successfully

## Phase 6: Ops and Security Hardening

- Status: `done`
- Objective: production readiness.
- Deliverables:
- observability baseline (logs, metrics, alerts)
- runbooks for incident handling
- request auth/signing and rate limiting policy
- delete-by-user flow validation
- Exit criteria:
- service is operable with clear failure recovery steps

## Phase 7: UAT and Cutover

- Status: `in_progress`
- Objective: controlled production adoption.
- Deliverables:
- UAT scope and acceptance matrix for conversion-critical events and identity fields
- canary rollout runbook with traffic ramp steps and owner handoff points
- parity check checklist and report template against previous tracking path (`event_count`, conversion rate, dedup rate, destination success/failure)
- rollback rehearsal checklist with trigger thresholds and communication path
- Exit criteria:
- production cutover approved with stable conversion integrity and no unresolved P0/P1 UAT defects
- parity check window passes agreed thresholds across canary and baseline paths
- rollback drill evidence captured and operationally executable

### Phase 7 gate checklist (current)

- [x] Kickoff completed with clear scope and ownership
- [x] Baseline artifacts prepared (phase status, dashboard alignment, near-term backlog)
- [x] UAT test scenarios and acceptance thresholds finalized
- [ ] Canary execution completed and monitored for agreed window
- [ ] Parity report reviewed and signed off
- [ ] Rollback rehearsal executed with evidence links
- [ ] Final go/no-go decision captured and phase moved to `done`

### Phase 7 active artifacts

- [UAT acceptance matrix](phase-7-uat-acceptance-matrix.md)
- [Parity report](phase-7-parity-report.md)
- [Rollback rehearsal checklist](phase-7-rollback-rehearsal.md)
- [Ops runbook](../07-ops/runbooks.md)

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
