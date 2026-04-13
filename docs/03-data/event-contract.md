# Canonical Event Contract

## Purpose

This is the canonical internal event shape. All clients, storage logic, routing logic, and platform adapters must conform to this contract.

## Canonical payload

```json
{
  "event_id": "uuid",
  "event_name": "purchase",
  "timestamp": "2026-04-13T10:00:00.000Z",
  "user": {
    "user_id": "uuid-or-null",
    "email_hash": "sha256-or-null",
    "anonymous_id": "uuid-or-null",
    "ip": "captured-ip",
    "user_agent": "captured-user-agent"
  },
  "session": {
    "session_id": "uuid",
    "source": "meta|google|tiktok|direct|email|referral|unknown",
    "campaign": "optional",
    "ad_id": "optional",
    "gclid": "optional",
    "ttclid": "optional"
  },
  "event_data": {
    "value": 49.99,
    "currency": "USD",
    "product_id": "book_01"
  },
  "context": {
    "page_url": "optional",
    "referrer": "optional",
    "client_name": "optional caller id",
    "schema_version": "v1"
  }
}
```

## Required fields

- `event_id`
- `event_name`
- `timestamp`
- `session.session_id`

`event_id` may be generated at ingress if missing from the caller.

## Optional fields

- `user.user_id`
- `user.email_hash`
- `user.anonymous_id`
- `session.source`
- `session.campaign`
- `session.ad_id`
- marketing click identifiers
- any event-specific fields inside `event_data`

## Normalization rules

- `event_name` stored as lower snake_case
- `timestamp` stored as UTC timestamptz
- `email_hash` stored lowercased hex SHA256 if present
- money values normalized to decimal numeric and currency kept explicitly
- raw email should not remain in canonical payload unless explicitly approved

## Derived fields

The processing layer may compute fields such as:

- `customer_type`: `new` or `returning`
- `event_value_normalized`
- `route_targets`
- `spam_score` or validation annotations

Derived fields should be stored in structured columns or payload metadata, not by mutating core identity semantics.

## Related docs

- [Schema](schema.md)
- [Deduplication](deduplication.md)
- [Tracking API](../04-api/tracking-api.md)
