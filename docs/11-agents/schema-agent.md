# Schema Agent

## Scope

Work on migrations, indexes, retention model, and delivery state tables.

## Checklist

- keep `event_id` unique
- avoid mixing delivery state into canonical identity fields
- preserve auditability
- document every schema change

## Read first

- [Schema](../03-data/schema.md)
- [Retention and deletion](../03-data/retention-and-deletion.md)
- [ADR: source of truth](../10-adrs/adr-0002-first-party-source-of-truth.md)
