# Tracking Base System

First-party tracking and event routing service.

This repository defines the system that receives events from external frontend and backend applications, stores them as the canonical source of truth, and then routes those stored events to downstream marketing and analytics platforms.

Core principle:

> One real-world event = one `event_id` = one canonical stored record = one downstream conversion.

## System role

- Accept event traffic from other repositories and services
- Normalize and enrich event payloads
- Deduplicate events before side effects
- Persist events in PostgreSQL or Supabase
- Route stored events to Meta, Google Ads, TikTok, and optional Umami
- Act as the recovery layer when browser pixels or vendor-side tracking is degraded

## Read first

- [Docs index](docs/README.md)
- [Start here](docs/00-start-here/README.md)
- [System summary](docs/00-start-here/system-summary.md)
- [Requirements](docs/01-product/requirements.md)
- [Architecture overview](docs/02-architecture/architecture-overview.md)
- [Canonical event contract](docs/03-data/event-contract.md)
- [Tracking API contract](docs/04-api/tracking-api.md)
- [AGENT guide](AGENT.md)

## Frontend console

This repo now includes an operational frontend app:

- Workspace: `apps/tracking-console`
- Start frontend: `npm run dev:console`
- Build frontend: `npm run build:console`
- Default frontend URL: `http://localhost:4173`
- API target in local dev: proxied from `/api/*` to `http://localhost:3000`

## Local ops start

To run the ingestion and routing path locally, start these pieces in order:

1. Redis
2. `tracking-api`
3. `router-worker`

Convenience scripts:

```bash
npm run dev:api
npm run dev:worker
npm run dev:stack
```

The API and worker each load dotenv from their own workspace directory. This repo now supports a shared source file and generated per-workspace env files:

```bash
cp env/.env.shared.example env/.env.shared
npm run env:check
npm run env:sync
```

`npm run env:sync` generates:

- `apps/tracking-api/.env`
- `apps/router-worker/.env`
- `deploy/app/.env`
- `deploy/infra/.env`

Minimum local queue settings:

```bash
REDIS_URL=redis://localhost:6379/0
ROUTER_QUEUE_NAME=router-deliveries
ROUTER_WORKER_NAME=router-delivery-worker
```

## Repository intent

This repository is documentation-first. The docs define the operating model that future implementation must follow.

Recommended implementation direction:

- Runtime: Node.js with TypeScript
- API: Fastify
- Database: PostgreSQL or Supabase Postgres
- Queue: Redis-backed queue or cloud queue with retry and DLQ support
- Routing: async worker service

## Success criteria

The system is ready for implementation when the docs clearly specify:

- event ingestion rules
- event identity and deduplication invariants
- storage model and indexes
- downstream platform mappings
- frontend integration contract for other repositories
- operational procedures, security, and test gates
