# Contract Tests

## `POST /track`

Cover at least:

- valid request with client `event_id`
- valid request without `event_id`
- missing `event_name`
- missing `session.session_id`
- duplicate `event_id`
- non-JSON payload

## Assertions

- response shape is stable
- `event_id` is always returned on success
- validation errors use stable error codes

## Related docs

- [Tracking API](../04-api/tracking-api.md)
- [API errors](../04-api/api-errors.md)
