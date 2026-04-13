# Deployment

## Recommended services

- `tracking-api`
- `router-worker`
- shared PostgreSQL or Supabase Postgres
- shared queue backend

## Environment tiers

- local
- staging
- production

## Release expectations

- database migrations before app rollout when required
- safe worker rollout that can process old job payloads
- environment-specific vendor credentials

## Rollback stance

- ingestion availability is highest priority
- if vendor adapters break, routing may be paused while ingestion stays active

## Related docs

- [Configuration](configuration.md)
- [Runbooks](runbooks.md)
