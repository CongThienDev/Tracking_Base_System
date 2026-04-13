# Session and Storage

## Session rules

- `session_id` begins on first eventable page visit
- inactivity timeout is 30 minutes
- new activity after timeout creates a new session

## Storage options

Preferred order:

1. first-party cookie when server and domain strategy requires it
2. localStorage when simpler frontend ownership is preferred

## Anonymous identity

- `anonymous_id` should persist longer than `session_id`
- `anonymous_id` should be stable across sessions until cleared or identity merge occurs

## Cross-repo expectation

The frontend repository owns browser persistence, but this repository defines the contract those values must satisfy.

## Related docs

- [Tracking SDK](tracking-sdk.md)
- [Identity and dedup](../01-product/identity-and-dedup.md)
