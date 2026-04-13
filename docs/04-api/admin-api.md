# Admin API

## Purpose

Non-public operational endpoints for inspection and recovery.

## Candidate endpoints

- `GET /health`
- `GET /events/:event_id`
- `POST /events/:event_id/replay`
- `DELETE /users/:user_id/events`
- `GET /deliveries?status=failed`

## Constraints

- never expose publicly without authentication and authorization
- do not mix admin concerns with ingestion endpoint behavior
- replay actions must be auditable

## Related docs

- [Runbooks](../07-ops/runbooks.md)
- [Privacy and GDPR](../08-security/privacy-and-gdpr.md)
