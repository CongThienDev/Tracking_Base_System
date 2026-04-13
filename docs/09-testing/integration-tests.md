# Integration Tests

## Core scenarios

### Purchase stored then routed

- send purchase event to `/track`
- assert row exists in `events`
- assert delivery records or jobs exist
- assert Meta, Google, or TikTok mock received mapped payload

### Duplicate purchase

- send same `event_id` twice
- assert one canonical row only
- assert one delivery record per destination only

### Meta browser and server parity

- simulate frontend pixel using same `event_id`
- verify server payload keeps identical `event_id`

### Retryable vendor failure

- mock transient failure on first attempt
- confirm retry occurs
- confirm eventual success or DLQ transition is recorded

## Related docs

- [Retries and queues](../07-ops/retries-and-queues.md)
- [Meta Conversions API](../05-integrations/meta-capi.md)
