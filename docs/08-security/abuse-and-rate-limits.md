# Abuse and Rate Limits

## Threats

- spam event floods
- malformed payload abuse
- credential misuse by untrusted senders
- replayed identical requests

## Mitigations

- request size limits
- content-type enforcement
- per-client or per-IP rate limiting
- signature verification for trusted server senders
- duplicate suppression through `event_id`

## Baseline policy

- apply a coarse per-IP limit to unauthenticated browser traffic
- apply a tighter per-client limit to signed server traffic
- keep burst capacity small enough to absorb short spikes without masking abuse
- reject requests that exceed size or rate policy before they reach downstream queues
- treat repeated auth failures as suspicious traffic and rate-limit them aggressively

## Rule

Rate limiting protects availability, but deduplication protects data integrity. Both are required.

## Related docs

- [Tracking API](../04-api/tracking-api.md)
- [Deduplication](../03-data/deduplication.md)
