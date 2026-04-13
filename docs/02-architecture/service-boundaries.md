# Service Boundaries

## Tracking API boundary

Owns:

- inbound request parsing
- validation
- metadata enrichment
- canonical normalization
- storage transaction
- enqueue trigger

Does not own:

- vendor-specific mapping
- slow retry loops
- long-running replay workflows

## Data layer boundary

Owns:

- canonical schema
- uniqueness and referential rules
- retention and deletion behavior

Does not own:

- request validation rules beyond database safety
- vendor response handling

## Router boundary

Owns:

- destination selection
- job creation
- replay orchestration

Does not own:

- initial event ingestion
- schema identity mutation

## Adapter boundary

Owns:

- payload translation
- destination auth
- transport-level retry classification

Does not own:

- business event meaning
- canonical storage

## Related docs

- [Architecture overview](architecture-overview.md)
- [Router API](../04-api/router-api.md)
- [Meta integration](../05-integrations/meta-capi.md)
