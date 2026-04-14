# Tracking Console Frontend

Operational frontend for `Tracking Base System`.

## Purpose

- Runtime health visibility for tracking API (`/health`, `/ready`, `/metrics`)
- Event debugger to send test payloads to `POST /track`
- Events workbench with advanced filters, selectable detail view, payload JSON, delivery timeline, and replay actions
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

## Events workbench contract

The Events screen now expects the admin API to support:

- `GET /admin/events` with filters for `event_id`, `event_name`, `source`, `destination`, `delivery_status`, `from`, `to`, `sort_by`, and `sort_dir`
- `GET /events/:event_id` returning event payload JSON plus delivery timeline data
- `POST /events/:event_id/replay` accepting an optional destination target for per-destination replay

If one of those endpoints is not available yet, the UI will still render loading/error states and keep the list view usable.
