# Auth and Signing

## Purpose

Define trust boundaries for other repositories and services that call this tracking base.

## Options

### Backend callers

- shared secret header
- HMAC request signing
- service-to-service auth through gateway if available

### Browser callers

- rely on origin controls and abuse protection
- do not embed long-lived privileged secrets in browser code

## Recommended stance

Use stronger authentication for server-to-server senders and lighter trust controls plus rate limits for browser-originated traffic.

## Related docs

- [Abuse and rate limits](abuse-and-rate-limits.md)
- [Configuration](../07-ops/configuration.md)
