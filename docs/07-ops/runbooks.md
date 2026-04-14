# Runbooks

## Common incidents

### Vendor outage

- confirm ingestion is still healthy
- pause or throttle the affected destination if needed
- allow retries or DLQ capture to absorb failures
- do not disable canonical event persistence

### Duplicate spike

- inspect recent `event_id` collision patterns
- confirm frontend and backend are not generating multiple IDs for the same event
- verify browser pixel and server event parity for Meta

### Queue backlog growth

- identify failing destination or worker bottleneck
- scale workers if safe
- validate that failures are not permanent payload errors

### Privacy deletion request

- locate `user_id`
- execute deletion or redaction workflow
- verify auxiliary tables are handled consistently

### Auth failure incident

- check whether the failing caller is server-to-server or browser-originated
- confirm the active auth mode: shared header, HMAC signature, or gateway auth
- verify the rejection reason in logs: missing header, bad signature, stale timestamp, or unexpected origin
- rotate or revoke the affected secret only after confirming the blast radius
- keep canonical ingestion enabled while the auth path is repaired

### Rate-limit incident

- identify whether the burst is a legitimate client spike or abuse
- confirm the active limit bucket: per-IP, per-client, or per-route
- check whether retries are amplifying the traffic pattern
- increase limits only for the smallest safe scope and only for the shortest safe window
- keep deduplication and request validation on even if limits are temporarily relaxed

### Delete-by-user validation

- run the delete validation script against `TEST_DATABASE_URL`
- confirm the script reports target user rows removed and control rows preserved
- if the script fails, inspect delete ordering first, then the seeded fixture data, then any table constraints
- rerun validation after the fix before marking the workflow ready

## Local readiness runbook

Use this when you want to run the queue path locally end to end.

### What needs to be up

- Redis for BullMQ
- `tracking-api`
- `router-worker`

### Environment layout

- `apps/tracking-api/.env` is loaded when you run the API workspace script
- `apps/router-worker/.env` is loaded when you run the worker workspace script
- the two apps do not read a shared repo-root `.env` file by default, so copy the values into each workspace that needs them

Recommended minimum values:

```bash
# Redis
REDIS_URL=redis://localhost:6379/0

# API
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/tracking_base
TRACKING_API_AUTH_MODE=off

# Worker
ROUTER_QUEUE_NAME=router-deliveries
ROUTER_WORKER_NAME=router-delivery-worker
ROUTER_WORKER_CONCURRENCY=5
```

### Start Redis

Use any local Redis you already trust. Common options:

```bash
# Docker
docker run --rm -p 6379:6379 redis:7-alpine

# Local service
redis-server
```

### Start the API

If you only need the API:

```bash
npm run dev:api
```

If you want the API plus worker in separate terminals:

```bash
npm run dev:api
npm run dev:worker
```

If you want both processes launched from one terminal after Redis is already up:

```bash
npm run dev:stack
```

### Start the worker

The worker needs Redis and can run without `DATABASE_URL`, but delivery state persistence is disabled until Postgres is configured.

```bash
npm run dev:worker
```

### Expected queued-only state

If Redis is up but Postgres is not configured for the worker, the system can still accept events and enqueue delivery jobs. In that case:

- `tracking-api` should return accepted responses for new events
- jobs should appear in the `router-deliveries` queue
- the worker should log that `DATABASE_URL` is missing and that canonical event fetch or delivery state updates are disabled

That state is useful for proving the queue path works, but it is not a complete end-to-end delivery setup.

### Troubleshooting queued-only states

- If the API accepts events but nothing reaches the worker, confirm both processes point at the same `REDIS_URL`
- If the worker exits immediately, check that one of `REDIS_URL` or `REDIS_HOST` is set
- If jobs are queued but never processed, confirm the worker name is not reusing a stale paused instance
- If delivery state never updates, set `DATABASE_URL` for the worker and restart it
- If you see retries but no terminal failure, inspect the worker logs for retryable destination errors before changing queue settings

## Phase 7 UAT and cutover runbook

### Scope and owners

- incident commander (release manager): owns go/no-go decisions, timeline, and comms
- tracking-api owner: owns ingress health, request validation behavior, and latency gates
- router-worker owner: owns queue drain behavior, destination success rate, and DLQ handling
- data owner: owns migration safety, schema compatibility, and data integrity checks
- qa/uat owner: owns UAT scenario execution and sign-off evidence

### Pre-cutover checklist (must pass before canary)

- production release notes are prepared, including previous stable version references for both services
- rollback targets are confirmed for `tracking-api` and `router-worker` (image tag, release id, or commit sha)
- required env vars are present and validated in production for API, worker, postgres, and redis queue
- latest safe migration is applied and verified as idempotent before app rollout
- health endpoint returns success on the candidate api release
- a 30-minute baseline snapshot is captured for:
  - events received per minute
  - validation failure rate
  - p95 ingestion latency
  - queue depth
  - delivery success rate by destination
  - retry rate and DLQ count
- release channel and escalation channel are announced with owners on-call

Example checks:

```bash
curl -fsS "$TRACKING_API_URL/health"
npm run migrate
```

### UAT execution (production-safe)

- run UAT traffic only from approved test caller identity and clearly tagged test events
- send deterministic events that cover at least:
  - one success path per enabled destination
  - one retryable downstream failure path
  - one permanent failure path that must end in failed/DLQ
  - one duplicate `event_id` path
- for each UAT event, verify:
  - `tracking-api` returns accepted response
  - canonical event persistence remains intact
  - worker delivery state transitions are correct (`pending/retrying/delivered/failed`)
  - no unexpected spike in auth failure or rate-limit hit rate

### Canary rollout steps

1. start with API canary at 5-10% ingress traffic to new `tracking-api` release.
2. deploy one canary `router-worker` instance with conservative concurrency (`QUEUE_CONCURRENCY=1`) while stable workers remain active.
3. observe gates for 15 minutes. if pass, increase API canary to 25%.
4. observe gates for 15 minutes. if pass, increase API canary to 50%.
5. observe gates for 15 minutes. if pass, move API to 100% and scale up new worker revision.
6. keep previous worker revision available until queue depth and DLQ remain stable for at least 30 minutes.

### Monitoring gates (pass/fail criteria)

Success criteria per canary window:

- `tracking-api` health check stays green
- validation failure rate does not increase by more than 1 percentage point from baseline
- p95 ingestion latency does not exceed baseline by more than 20%
- queue depth is stable or recovering (no sustained monotonic growth)
- delivery success rate by destination does not drop by more than 2 percentage points
- retry rate and DLQ count remain within expected baseline band
- auth failure rate stays below `5%` over 5 minutes
- rate-limit hit rate stays below `2%` sustained over 10 minutes

Failure criteria for immediate hold:

- sustained non-2xx ingestion errors from `tracking-api`
- queue depth grows for 15+ minutes without recovery
- destination delivery success rate breaches the 2 percentage point drop threshold
- DLQ growth exceeds baseline trend and continues across two checks
- data integrity issues detected (unexpected duplicate behavior or missing delivery state updates)

### Rollback triggers

- any failure criteria above persists across two consecutive monitoring checks
- canonical event persistence is at risk or inconsistent
- rollback confidence for current release is lower than continuing blast-radius risk

### Rollback steps

1. declare rollback in release channel and freeze further rollout changes.
2. shift ingress traffic back to previous stable `tracking-api` release.
3. stop or scale down canary `router-worker` revision, keep stable worker revision active.
4. keep ingestion online; do not disable canonical writes during rollback.
5. verify queue processing on stable workers and isolate failed canary jobs for replay.
6. replay affected failed jobs from canonical event data after stable release is confirmed.
7. run post-rollback checks:
   - api health green
   - queue depth trending down
   - DLQ no longer increasing abnormally
   - destination success rates back within baseline band

### Post-cutover verification

- run a 60-minute heightened monitoring window after 100% rollout
- confirm no open P1/P2 alerts related to ingestion, queue backlog, or delivery failures
- validate delete-by-user workflow still passes in the operational test environment
- record cutover evidence: timeline, gate results, incidents, and final owner sign-off
- close release only when incident commander, api owner, and worker owner all sign off

## Phase 7 command examples

```bash
# API health
curl -fsS "$TRACKING_API_URL/health"

# run migration before application rollout (idempotent expected)
npm run migrate

# validate privacy deletion workflow in test operational database
npm run validate:delete-by-user
```

## Operator rule

When in doubt, protect ingestion and storage first. Routing can degrade temporarily; source-of-truth integrity cannot.

## Related docs

- [Observability](observability.md)
- [Retention and deletion](../03-data/retention-and-deletion.md)
