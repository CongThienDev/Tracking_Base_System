# Umami

## Purpose

Optional low-risk forwarding target for debugging and basic analytics.

## Scope

Only forward a minimal subset of events and fields.

Recommended:

- `page_view`
- `view_content`
- selected funnel events with redacted payloads

## Do not send

- full raw payloads
- unhashed personal data
- delivery-internal metadata

## Role in system

Umami is auxiliary only. It is not part of attribution truth.

## Related docs

- [System summary](../00-start-here/system-summary.md)
- [PII handling](../08-security/pii-handling.md)
