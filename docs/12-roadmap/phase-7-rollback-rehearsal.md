# Phase 7 Rollback Rehearsal Checklist

## Purpose

Prove rollback can be executed safely while preserving canonical ingestion.

## Preconditions

- stable rollback targets are known for both services:
  - `tracking-api`: `<image tag|release id|commit>`
  - `router-worker`: `<image tag|release id|commit>`
- communication channel and incident commander are active
- canary revision is deployed and observable

## Trigger Thresholds

Rollback rehearsal should be declared successful only if runbook steps complete within target time and recovery metrics return to baseline.

- time to switch ingress back to stable API: `<= 10 minutes`
- time to restore stable worker processing: `<= 10 minutes`
- queue depth recovery trend observed within `15 minutes`
- no canonical write interruption during rehearsal

## Rehearsal Steps

1. announce rehearsal start in release channel.
2. mark current canary revision identifiers for audit trail.
3. route ingress back to stable `tracking-api` revision.
4. stop/scale down canary `router-worker` revision.
5. confirm stable worker revision is active and consuming queue.
6. verify:
   - API `/health` is green
   - queue depth is stable or decreasing
   - delivery success rate returns to baseline band
7. identify failed canary jobs and execute replay from canonical store.
8. announce rehearsal complete with timestamps and metrics snapshot.

## Evidence Record (Template)

- rehearsal date/time: `<utc>`
- incident commander: `<name>`
- API owner: `<name>`
- Worker owner: `<name>`
- canary revisions:
  - api: `<id>`
  - worker: `<id>`
- stable rollback revisions:
  - api: `<id>`
  - worker: `<id>`
- measured timings:
  - ingress rollback time: `<minutes>`
  - worker rollback time: `<minutes>`
  - queue recovery observed at: `<timestamp>`
- outcome:
  - `<pass|fail>`
- follow-up actions:
  - `<items>`

## Sign-off

- [ ] rehearsal completed end-to-end
- [ ] evidence captured
- [ ] unresolved risks documented
- [ ] release lead approved rollback readiness
