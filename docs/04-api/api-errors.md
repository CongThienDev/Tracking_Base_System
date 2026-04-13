# API Errors

## Error model

Use structured error responses with stable codes.

## Recommended codes

- `validation_error`
- `unsupported_media_type`
- `unauthorized`
- `rate_limited`
- `duplicate_event`
- `internal_error`

## Principles

- keep messages actionable but not overly revealing
- include request correlation ID in logs, optionally in response headers
- downstream vendor failures should not normally surface through `/track`

## Related docs

- [Tracking API](tracking-api.md)
- [Abuse and rate limits](../08-security/abuse-and-rate-limits.md)
