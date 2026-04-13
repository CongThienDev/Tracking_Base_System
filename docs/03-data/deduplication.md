# Deduplication

## Mandatory rule

`event_id` is the primary deduplication key across all layers.

## End-to-end behavior

- frontend generates `event_id` when possible
- tracking API preserves provided `event_id`
- tracking API generates one only when the client omitted it
- database enforces uniqueness on `event_id`
- router uses stored `event_id` unchanged
- Meta and TikTok payloads include the same `event_id`
- Google Ads uses `event_id` where supported and keeps `gclid` when present

## Duplicate insert behavior

Recommended ingestion behavior:

- attempt insert using unique `event_id`
- if conflict occurs, do not create a second event row
- return an idempotent success response with the same `event_id`
- do not enqueue additional downstream delivery jobs

## Fallback strategy

Fallback hash is only for legacy transition periods.

If the caller has no `event_id`, the service may derive a temporary dedup candidate from:

```text
hash(user_id + event_name + timestamp)
```

This is weaker than a true UUID and must not become the long-term design center.

## Logging requirements

Must log:

- duplicate `event_id` attempts
- generated server-side `event_id` events
- mismatches between frontend browser pixel event identity and server event identity when detectable

## Risks if broken

- inflated conversion counts
- broken attribution windows
- unstable ad platform optimization
- impossible replay confidence

## Related docs

- [Identity and dedup](../01-product/identity-and-dedup.md)
- [ADR: event ID standard](../10-adrs/adr-0001-event-id-standard.md)
- [Meta integration](../05-integrations/meta-capi.md)
