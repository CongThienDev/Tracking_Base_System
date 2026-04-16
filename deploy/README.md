# Deploy Layout

This folder separates deploy concerns:

- `deploy/app`: application containers (`tracking-console`, `tracking-api`, `router-worker`).
- `deploy/infra`: shared infrastructure containers (`redis`).
- `deploy/vps`: upload-first guide and host Nginx template for VPS rollout.

## Is this model correct for current repo flow?

Yes, this matches the current architecture:

1. `tracking-api` receives `POST /track`.
2. API enqueues delivery jobs to Redis/BullMQ.
3. `router-worker` consumes jobs and pushes to destinations.
4. `tracking-console` serves dashboard UI and proxies `/api/*` to `tracking-api`.
5. Postgres remains the canonical source of truth.

## Prerequisites

1. GHCR images exist for both services:
   - `tracking-console`
   - `tracking-api`
   - `router-worker`
2. Postgres is reachable (Railway/Supabase/self-hosted).
3. `DATABASE_URL` and `REDIS_URL` are set consistently for both services.

## Run

### 1) Start infra (creates shared Docker network `tracking-base-net`)

```bash
cd deploy/infra
cp .env.example .env
docker compose up -d
```

### 2) Start app

```bash
cd deploy/app
cp .env.example .env
# edit .env values first
docker compose pull
docker compose up -d --no-build
```

### 3) Smoke check

```bash
curl -I http://127.0.0.1:18081
curl -fsS http://127.0.0.1:13001/health
curl -fsS http://127.0.0.1:13001/ready
```

## Notes

- Keep `router-worker` private (do not expose ports).
- `tracking-console` listens on `${TRACKING_CONSOLE_PORT:-18081}` and is the recommended public entrypoint for dashboard.
- `tracking-console` container includes Nginx and forwards `/api/*` internally to `tracking-api`.
- If you already run host-level Nginx/Caddy for TLS, proxy `https://your-domain` to `http://127.0.0.1:${TRACKING_CONSOLE_PORT}`.
- `tracking-api` may still need a public endpoint for ingestion (`POST /track`) depending on your architecture.
- If GHCR images are private, `docker login ghcr.io` is required on the VPS.

## GHCR image naming from CI

This repository workflow publishes images to:

- `ghcr.io/<github-owner>/<repo>/tracking-console:{latest|staging-<sha>}`
- `ghcr.io/<github-owner>/<repo>/tracking-api:{latest|staging-<sha>}`
- `ghcr.io/<github-owner>/<repo>/router-worker:{latest|staging-<sha>}`

Example if your repo is `CongThienDev/Tracking_Base_System`:

- `ghcr.io/congthiendev/tracking_base_system/tracking-console:latest`
- `ghcr.io/congthiendev/tracking_base_system/tracking-api:latest`
- `ghcr.io/congthiendev/tracking_base_system/router-worker:latest`
