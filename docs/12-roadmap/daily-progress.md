# Daily Progress Log

## Purpose

This file tracks day-by-day execution progress for roadmap phases.

## Rule

- Add one entry for each working day with project activity.
- Do not skip updates when work was blocked.
- If no work happened, add a short `no_activity` note.

## Entry template

```md
## YYYY-MM-DD

- Owner: <name>
- Phase: <phase-id and name>
- Status: <not_started|in_progress|blocked|review|done>
- Completed today:
- Evidence:
- Blockers:
- Next step (next working day):
```

## Log

## 2026-04-13

- Owner: team
- Phase: Phase 0 - Foundation Freeze
- Status: done
- Completed today:
- Documentation architecture created
- Core docs baseline established
- AGENT operating guide added
- Queue technology decision locked for MVP: `BullMQ + Redis`
- Evidence:
- `README.md`
- `AGENT.md`
- `docs/README.md`
- `docs/12-roadmap/implementation-phases.md`
- `docs/10-adrs/adr-0004-queue-technology-choice.md`
- Blockers:
- none
- Next step (next working day):
- Start Phase 1 implementation

## 2026-04-13 (update 2)

- Owner: team
- Phase: Phase 1 - Ingestion Core
- Status: in_progress
- Completed today:
- Scaffolded `apps/tracking-api` with TypeScript and Fastify
- Implemented `POST /track` with validation, enrichment, and idempotent dedup by `event_id`
- Added Postgres repository and Phase 1 SQL migration
- Added API tests for valid insert, duplicate dedup, and validation error
- Build and tests passed
- Added migration script and Postgres integration test scaffold
- Evidence:
- `apps/tracking-api/src/routes/track.ts`
- `apps/tracking-api/src/services/normalize-track-event.ts`
- `apps/tracking-api/src/repositories/postgres-event-repository.ts`
- `apps/tracking-api/test/track-route.test.ts`
- `apps/tracking-api/test/track-route.postgres.test.ts`
- `apps/tracking-api/scripts/migrate.ts`
- `infra/sql/001_phase1_ingestion.sql`
- Blockers:
- local Postgres credential not available in repository context (`28P01` on migrate)
- Next step (next working day):
- set valid `DATABASE_URL` and `TEST_DATABASE_URL`, run migrate and Postgres integration test, then close Phase 1 gate

## 2026-04-13 (update 3)

- Owner: team
- Phase: Phase 1 - Ingestion Core
- Status: done
- Completed today:
- Ran migration successfully against Railway Postgres
- Ran Postgres integration test and confirmed DB-level dedup with duplicate `event_id`
- Re-ran build and confirmed compile success
- Evidence:
- `npm run migrate` (with valid Railway `DATABASE_URL`) -> success
- `npm test` (with `TEST_DATABASE_URL`) -> includes `track-route.postgres.test.ts` pass
- `npm run build` -> pass
- Blockers:
- none
- Next step (next working day):
- Start Phase 2 async routing skeleton with BullMQ + Redis baseline

## 2026-04-13 (update 4)

- Owner: team
- Phase: Phase 2 - Async Routing Skeleton
- Status: in_progress
- Completed today:
- Added Phase 2 routing-state migration for `event_deliveries`
- Added delivery and event indexes aligned with canonical schema docs
- Kept migration idempotent for safe reruns
- Evidence:
- `infra/sql/002_phase2_event_deliveries.sql`
- Blockers:
- none
- Next step (next working day):
- implement router worker queue wiring and event delivery upsert flow

## 2026-04-13 (update 5)

- Owner: team
- Phase: Phase 2 - Async Routing Skeleton
- Status: in_progress
- Completed today:
- Added `apps/router-worker` BullMQ + Redis worker skeleton with retry-aware processor tests
- Added tracking-api delivery dispatcher abstraction and async enqueue handoff after successful insert
- Added failure-tolerant enqueue behavior so ingestion still returns success when queue dispatch fails
- Added root scripts for router worker build and test
- Applied Phase 2 migration to Railway DB and verified migration rerun safety
- Evidence:
- `apps/router-worker/src/runtime/router-worker-runtime.ts`
- `apps/router-worker/src/processor/process-delivery-job.ts`
- `apps/tracking-api/src/services/delivery-job-dispatcher.ts`
- `apps/tracking-api/src/services/dispatch-delivery-job.ts`
- `apps/tracking-api/test/track-route.test.ts`
- `infra/sql/002_phase2_event_deliveries.sql`
- `npm run build` -> pass
- `npm test` with Railway `TEST_DATABASE_URL` -> pass
- `npm run build:router-worker` and `npm run test:router-worker` -> pass
- `npm run migrate` with Railway `DATABASE_URL` -> pass
- Blockers:
- `event_deliveries` status update flow from worker runtime into Postgres is not implemented yet
- Next step (next working day):
- implement Postgres-backed delivery state writer in router worker and close Phase 2 gate

## 2026-04-13 (update 6)

- Owner: team
- Phase: Phase 2 - Async Routing Skeleton
- Status: done
- Completed today:
- Implemented Postgres-backed delivery state writer in router worker
- Worker now writes `delivered`, `retrying`, and `failed` states into `event_deliveries`
- Added unit tests for delivery state writer
- Re-verified build and tests for both apps
- Re-ran migrations and DB-backed tracking-api test suite on Railway
- Evidence:
- `apps/router-worker/src/state/delivery-state-writer.ts`
- `apps/router-worker/src/runtime/router-worker-runtime.ts`
- `apps/router-worker/test/delivery-state-writer.test.ts`
- `npm run build` -> pass
- `npm run build:router-worker` -> pass
- `npm run test:router-worker` -> pass
- `npm run migrate` (Railway DB) -> pass
- `npm test` with Railway `TEST_DATABASE_URL` -> pass
- Blockers:
- none
- Next step (next working day):
- start Phase 3 Meta integration (mapper + API client + contract tests)

## 2026-04-13 (update 7)

- Owner: team
- Phase: Phase 4 - TikTok and Google Integrations
- Status: done
- Completed today:
- Implemented `TikTokEventsAdapter` with canonical event mapping, `ttclid` propagation, and retry classification
- Implemented `GoogleConversionAdapter` with `gclid` handling, conversion payload mapping, and retry classification
- Router worker now fetches canonical event from Postgres before adapter delivery and fails terminal when event is missing
- Added destination-specific BullMQ retry policies (`meta`, `google`, `tiktok`) in dispatcher
- Added unit test coverage for adapters, runtime canonical-event fetch path, and destination retry policy
- Evidence:
- `apps/router-worker/src/adapters/tiktok-events-adapter.ts`
- `apps/router-worker/src/adapters/google-conversion-adapter.ts`
- `apps/router-worker/src/db/event-repository.ts`
- `apps/router-worker/src/runtime/router-worker-runtime.ts`
- `apps/tracking-api/src/services/delivery-job-dispatcher.ts`
- `apps/router-worker/test/tiktok-events-adapter.test.ts`
- `apps/router-worker/test/google-conversion-adapter.test.ts`
- `apps/router-worker/test/router-worker-runtime.test.ts`
- `apps/tracking-api/test/delivery-job-dispatcher.test.ts`
- `npm run -w @tracking-base/router-worker test` -> pass
- `npm run -w @tracking-base/router-worker build` -> pass
- `npm run -w @tracking-base/tracking-api test` -> pass
- Blockers:
- none
- Next step (next working day):
- implement Phase 3 Meta adapter/client to keep all downstream integrations aligned on one adapter contract
