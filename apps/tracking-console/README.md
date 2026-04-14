# Tracking Console Frontend

Operational frontend for `Tracking Base System`.

## Purpose

- Runtime health visibility for tracking API (`/health`, `/ready`, `/metrics`)
- Event debugger to send test payloads to `POST /track`
- Flow explorer for ingestion-to-destination lifecycle
- Phase 7 cutover control board for go/no-go execution

## Run

```bash
npm run dev
npm run dev:console
```

Default frontend URL: `http://localhost:4173`.
Default API proxy target: `http://localhost:3000` via `/api/*`.

## Folder layout (Layout Architect)

- `src/app`: bootstrap, providers, router, app shell
- `src/pages`: route-level composition only
- `src/widgets`: composed screen blocks
- `src/features`: user interactions and workflows
- `src/entities`: domain model/types
- `src/shared`: config, API client, helpers, low-level UI primitives

Rule: dependencies flow downward only (`pages -> widgets -> features -> entities -> shared`).
