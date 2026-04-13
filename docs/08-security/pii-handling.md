# PII Handling

## Allowed identity signals

- `user_id`
- hashed email
- anonymous ID
- session ID
- IP and user-agent as request metadata

## Rules

- prefer hashed email over raw email
- if raw email is accepted at ingress, normalize and hash immediately
- do not replicate raw PII into logs
- keep payload examples sanitized

## Storage stance

Raw personal data should not be a default field in canonical storage.

## Related docs

- [Privacy and GDPR](privacy-and-gdpr.md)
- [Tracking API](../04-api/tracking-api.md)
