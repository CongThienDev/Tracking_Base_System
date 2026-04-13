# Phase 7 UAT Acceptance Matrix

## Purpose

Define UAT scenarios and pass/fail thresholds for Phase 7 cutover decisions.

## Scope

- services: `tracking-api`, `router-worker`
- data path: ingest -> canonical store -> queue -> destination adapters
- destinations: Meta, Google, TikTok (enabled by environment)

## Owners

- QA/UAT owner: executes scenarios and records evidence
- Tracking API owner: validates ingress behavior and latency
- Router Worker owner: validates queue and delivery states
- Data owner: validates canonical integrity and parity signals

## Acceptance Thresholds

- ingestion success (`2xx` for valid events): `>= 99.5%`
- validation failure rate (`4xx` due to bad payload): `<= 1.0%`
- p95 ingestion latency (canary vs baseline): `<= +20%`
- queue depth trend during canary window: no sustained growth over 15 minutes
- destination delivery success (per destination): no drop greater than `2.0` percentage points vs baseline
- dedup behavior: duplicate `event_id` does not create extra canonical row (0 tolerance)
- auth failure rate: `< 5%` over rolling 5 minutes
- rate-limit hit rate: `< 2%` sustained over 10 minutes
- parity mismatch ratio (global): `<= 0.05` unless explicitly overridden by release lead

## Scenario Matrix

| ID | Scenario | Steps | Expected Result | Evidence |
| --- | --- | --- | --- | --- |
| UAT-01 | Valid purchase event | Send canonical `purchase` event with stable `event_id` | API `200`, event persisted, delivery enqueued | API response + DB row + queue state |
| UAT-02 | Duplicate event dedup | Send same payload twice with same `event_id` | first `deduplicated=false`, second `deduplicated=true`, one canonical row | API responses + DB count query |
| UAT-03 | Validation failure | Send invalid payload (missing required fields) | API `400`, no canonical write, no delivery job | API response + DB/queue check |
| UAT-04 | Retryable destination failure | Force adapter retryable error | delivery moves to `retrying`, attempt count increments | worker logs + `event_deliveries` row |
| UAT-05 | Terminal destination failure | Force non-retryable error | delivery moves to `failed`/DLQ policy path | worker logs + delivery state |
| UAT-06 | Auth rejection | Call `/track` without required auth in secured mode | API `401`, no canonical write | API response + DB check |
| UAT-07 | Rate-limit enforcement | Burst requests over configured threshold | API `429` on excess, service remains healthy | response stats + health checks |
| UAT-08 | End-to-end parity sample | Compare canary aggregate counts with legacy baseline using parity script | mismatch ratio within threshold | parity report JSON + sign-off |

## Sign-off Checklist

- [ ] all required UAT scenarios executed
- [ ] no unresolved P0/P1 defects
- [ ] thresholds met or formally waived with rationale
- [ ] evidence links attached for each scenario
- [ ] QA/UAT owner + API owner + Worker owner sign-off recorded
