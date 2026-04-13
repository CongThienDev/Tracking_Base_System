# TikTok Events API

## Purpose

Deliver stored events to TikTok while preserving canonical event identity and retry safety.

## Requirements

- include mapped event name
- include event timestamp
- include `event_id`
- include `user_data` where permitted
- include `ttclid` or click identifier when available

## Mapping stance

TikTok event mapping should stay close to Meta semantics where practical, but the internal contract remains primary.

## Retry behavior

- retry transient network and 5xx failures
- do not retry permanent validation failures indefinitely
- preserve the same `event_id` across all attempts

## Example payload skeleton

```json
{
  "event": "CompletePayment",
  "event_id": "9b35c3c8-52b6-41bd-9327-1ff38a76a4de",
  "timestamp": "2026-04-13T10:00:00.000Z",
  "context": {
    "ip": "203.0.113.1",
    "user_agent": "Mozilla/5.0",
    "ttclid": "optional"
  },
  "properties": {
    "value": 49.99,
    "currency": "USD"
  }
}
```

## Related docs

- [Deduplication](../03-data/deduplication.md)
- [Router API](../04-api/router-api.md)
- [Retries and queues](../07-ops/retries-and-queues.md)
