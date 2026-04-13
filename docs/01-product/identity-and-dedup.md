# Identity and Dedup

## Identity priority

User identity resolution follows this order:

1. `user_id`
2. hashed email
3. `anonymous_id`

`session_id` is session context, not a replacement for user identity.

## Session rules

- create `session_id` on first qualifying visit
- persist in cookie or localStorage
- expire after 30 minutes of inactivity
- rotate session when inactivity threshold is crossed

## Deduplication principle

The system deduplicates first by `event_id`.

Fallback hash-based deduplication exists only as a contingency when legacy clients do not supply an `event_id`.

## Why this matters

Without strict event identity:

- one purchase can be counted multiple times
- Meta browser and server events cannot deduplicate safely
- optimization signals become unstable

## Related docs

- [Event contract](../03-data/event-contract.md)
- [Deduplication](../03-data/deduplication.md)
- [Frontend SDK](../06-frontend/tracking-sdk.md)
