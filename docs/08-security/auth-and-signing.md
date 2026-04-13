# Auth and Signing

## Purpose

Define trust boundaries for other repositories and services that call this tracking base.

## Options

### Backend callers

- shared secret header, sent as `x-tracking-auth`
- HMAC request signing over method, path, timestamp, and body hash
- service-to-service auth through gateway if available
- reject requests with missing credentials, malformed signatures, or stale timestamps

### Browser callers

- rely on origin controls and abuse protection
- do not embed long-lived privileged secrets in browser code

## Recommended stance

Use stronger authentication for server-to-server senders and lighter trust controls plus rate limits for browser-originated traffic.

## Header and signature policy

- require exactly one auth mechanism per request path
- treat the shared header as a bearer secret and rotate it on a fixed cadence
- include a timestamp in signed requests and reject timestamps outside the allowed skew window
- verify the request body hash before any business logic or side effects run
- log only auth outcome metadata, never the full secret or raw signature material
- fail closed on parsing errors, clock skew violations, or signature mismatch

## Operational checks

- if auth failures spike, first confirm whether the caller changed its signing logic or clock source
- if a secret is rotated, update the caller and receiver together
- if browser traffic needs protection, prefer gateway enforcement and rate limits over embedding privileged secrets

## Related docs

- [Abuse and rate limits](abuse-and-rate-limits.md)
- [Configuration](../07-ops/configuration.md)
