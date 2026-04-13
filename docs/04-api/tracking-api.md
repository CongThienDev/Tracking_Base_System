# Tracking API

## Endpoint

```http
POST /track
Content-Type: application/json
```

## Purpose

Receive events from external frontend repositories and backend services, normalize them, persist them, and trigger async routing.

## Request contract

```json
{
  "event_id": "uuid-optional-but-recommended",
  "event_name": "purchase",
  "timestamp": "2026-04-13T10:00:00.000Z",
  "user": {
    "user_id": "uuid-or-null",
    "email": "optional-plain-only-at-edge",
    "email_hash": "optional-prehashed",
    "anonymous_id": "uuid-or-null"
  },
  "session": {
    "session_id": "uuid",
    "source": "meta",
    "campaign": "spring_sale",
    "ad_id": "12345",
    "gclid": "optional",
    "ttclid": "optional"
  },
  "event_data": {
    "value": 49.99,
    "currency": "USD",
    "product_id": "book_01"
  },
  "context": {
    "page_url": "https://example.com/checkout",
    "referrer": "https://google.com"
  }
}
```

## Validation rules

Required:

- `event_name`
- `session.session_id`

Recommended:

- `event_id`
- `timestamp`

Behavior:

- reject non-JSON payloads
- reject malformed or unknown root types
- reject events with missing required fields
- normalize `event_name` casing
- hash raw email at ingress if allowed to receive it

## Enrichment rules

The service may auto-populate:

- `event_id` if missing
- `timestamp` if missing
- request IP
- `user_agent`
- server receive timestamp

## Response

### Success

```json
{
  "status": "ok",
  "event_id": "9b35c3c8-52b6-41bd-9327-1ff38a76a4de"
}
```

### Validation failure

```json
{
  "status": "error",
  "code": "validation_error",
  "message": "session.session_id is required"
}
```

### Duplicate idempotent result

```json
{
  "status": "ok",
  "event_id": "9b35c3c8-52b6-41bd-9327-1ff38a76a4de",
  "deduplicated": true
}
```

## Performance target

- normal path should complete without waiting on vendor APIs
- p95 under 200 ms for nominal load

## Security notes

- treat caller IP as request metadata, not user truth in every case
- raw email should be short-lived and normalized immediately if accepted at all

## Related docs

- [API errors](api-errors.md)
- [Event contract](../03-data/event-contract.md)
- [Deduplication](../03-data/deduplication.md)
