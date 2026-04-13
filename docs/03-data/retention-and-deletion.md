# Retention and Deletion

## Objectives

- keep enough history for attribution, replay, and audits
- support user deletion requests
- minimize retained sensitive data

## Proposed retention policy

- canonical events: retain 24 months by default unless business policy changes
- delivery attempt records: retain 90 to 180 days depending on operational needs
- raw request logs: retain shorter than event records and avoid full payload duplication where possible

## Deletion policy

The system must support delete-by-user across:

- `users`
- `events` filtered by `user_id`
- any auxiliary tables keyed by user identity where applicable

## Redaction strategy

If full deletion is operationally unsafe for aggregated auditing, prefer irreversible redaction for non-essential fields while preserving a minimal audit trail.

## Related docs

- [Schema](schema.md)
- [Privacy and GDPR](../08-security/privacy-and-gdpr.md)
