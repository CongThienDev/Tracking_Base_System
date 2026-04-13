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

## Operator rule

When in doubt, protect ingestion and storage first. Routing can degrade temporarily; source-of-truth integrity cannot.

## Related docs

- [Observability](observability.md)
- [Retention and deletion](../03-data/retention-and-deletion.md)
