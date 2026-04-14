# Admin API

## Purpose

Non-public operational endpoints for inspection and recovery.

## Implemented endpoint

- `GET /admin/events?limit=20&offset=0&event_name=purchase&source=meta&delivery_status=queued`

### Response shape

```json
{
  "status": "ok",
  "paging": {
    "limit": 20,
    "offset": 0,
    "total": 120
  },
  "items": [
    {
      "eventId": "evt_123",
      "eventName": "purchase",
      "eventTimestamp": "2026-04-14T10:00:00.000Z",
      "sessionId": "sess_123",
      "source": "meta",
      "campaign": "spring_sale",
      "routeStatus": "pending",
      "eventValue": 49.99,
      "currency": "USD",
      "createdAt": "2026-04-14T10:00:01.000Z",
      "deliveryOverallStatus": "queued",
      "deliveries": [
        {
          "destination": "meta",
          "status": "delivered",
          "attemptCount": 1,
          "updatedAt": "2026-04-14T10:00:05.000Z",
          "lastErrorMessage": null
        }
      ]
    }
  ]
}
```

Delivery status mapping for operator UI:

- `queued`: no delivery rows yet, or still retrying/pending
- `success`: all known delivery rows are `delivered`
- `failed`: at least one delivery row is `failed`

Supported filters:

- `event_name`: case-insensitive partial match (`ILIKE`)
- `source`: case-insensitive exact match
- `delivery_status`: one of `queued`, `success`, `failed`

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
