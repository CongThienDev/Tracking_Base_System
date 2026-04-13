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

## Rule

Rate limiting protects availability, but deduplication protects data integrity. Both are required.

## Related docs

- [Tracking API](../04-api/tracking-api.md)
- [Deduplication](../03-data/deduplication.md)
