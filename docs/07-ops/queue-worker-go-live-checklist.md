# Queue Worker Go-Live Checklist

Use this page when you need to run queue + worker end-to-end without guessing.

## Goal

After a frontend sends an event, the system should move through these states:

1. API accepts event (`POST /track` -> `status: ok`)
2. Event is saved in DB
3. Job is pushed to queue
4. Worker picks job and sends to destination
5. Delivery state changes from `queued` to `success` or `failed`

## What must be running

- Redis
- `tracking-api`
- `router-worker`
- Postgres (already used by API and worker)

## Required env vars

### `apps/tracking-api/.env`

- `DATABASE_URL`
- `REDIS_URL`
- `ROUTER_QUEUE_NAME=router-deliveries`
- `TRACKING_API_AUTH_MODE=off` (for local test only)

### `apps/router-worker/.env`

- `DATABASE_URL`
- `REDIS_URL`
- `ROUTER_QUEUE_NAME=router-deliveries`
- `ROUTER_WORKER_CONCURRENCY=5` (or lower for safer local test)

## Start order (local)

1. Start Redis
2. Start API: `npm run dev:api`
3. Start Worker: `npm run dev:worker`
4. Start Console: `npm run dev:console`

Or run API + worker together after Redis is up:

- `npm run dev:stack`

## Smoke test (must pass)

1. Call `/health` and `/ready` -> both should be ok
2. Send one event from Event Debugger or curl
3. Open Console -> Events tab
4. Confirm new event appears
5. Wait and refresh:
- if worker works: status moves from `queued` to `success`/`failed`
- if still `queued` for long: queue path is broken

## If status is stuck at `queued`

Check in this order:

1. Worker process is running (not crashed)
2. Worker env has `REDIS_URL`
3. API and worker use the same `ROUTER_QUEUE_NAME`
4. Worker has `DATABASE_URL`
5. Redis is reachable from both processes

## If status is `failed`

1. Open event detail
2. Read failed destination and error message
3. Fix destination credentials/config
4. Use replay button to resend failed destination

## Done criteria

Mark queue/worker flow as healthy only when all are true:

- New events are accepted quickly by API
- Events appear in DB
- Worker processes jobs continuously
- Delivery states move out of `queued`
- Replay works for failed events
