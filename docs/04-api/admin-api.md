# Admin API

## Purpose

Non-public operational endpoints for inspection and recovery.

## Endpoints

### `GET /admin/events`

Returns a paginated list of tracked events.

Example:

`GET /admin/events?limit=20&offset=0&event_name=purchase&source=meta&delivery_status=queued&from=2026-04-13T00:00:00.000Z&to=2026-04-14T00:00:00.000Z&destination=google&event_id=evt_123&event_id_like=evt_&sort_by=created_at&sort_order=desc`

Response shape:

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

Supported filters:

- `event_name`: case-insensitive partial match
- `source`: case-insensitive match
- `delivery_status`: one of `queued`, `success`, `failed`
- `from` / `to`: inclusive `createdAt` range filter
- `destination`: exact destination filter
- `event_id`: exact event id filter
- `event_id_like`: case-insensitive partial event id search
- `sort_by`: one of `created_at`, `event_timestamp`, `event_name`
- `sort_order`: one of `asc`, `desc`

Delivery status mapping for operator UI:

- `queued`: no delivery rows yet, or still retrying/pending
- `success`: all known delivery rows are `delivered`
- `failed`: at least one delivery row is `failed`

### `GET /admin/events/:event_id`

Returns the full canonical event record and every delivery row.

Response shape:

```json
{
  "status": "ok",
  "event": {
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
    "updatedAt": "2026-04-14T10:00:02.000Z",
    "userId": "user_123",
    "emailHash": "hash_123",
    "anonymousId": "anon_123",
    "adId": null,
    "gclid": null,
    "ttclid": null,
    "customerType": "consumer",
    "payload": {
      "value": 49.99,
      "currency": "USD"
    },
    "ingestIp": "203.0.113.10",
    "userAgent": "Mozilla/5.0",
    "deliveryOverallStatus": "failed",
    "deliveries": [
      {
        "destination": "meta",
        "status": "failed",
        "attemptCount": 2,
        "updatedAt": "2026-04-14T10:00:06.000Z",
        "lastErrorCode": "timeout",
        "lastErrorMessage": "request timed out",
        "lastResponseSummary": {
          "worker": "router-worker-1"
        },
        "nextAttemptAt": "2026-04-14T10:01:06.000Z",
        "deliveredAt": null,
        "createdAt": "2026-04-14T10:00:03.000Z"
      }
    ]
  }
}
```

### `POST /admin/events/:event_id/replay`

Re-enqueues delivery jobs for the failed rows by default, or for the explicitly selected destination list.

Request body:

```json
{
  "destinations": ["meta", "google"]
}
```

If `destinations` is omitted, the API replays only failed delivery rows. Supported destination names are `meta`, `google`, and `tiktok`.

Response shape:

```json
{
  "status": "ok",
  "event": {
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
    "updatedAt": "2026-04-14T10:00:02.000Z",
    "userId": "user_123",
    "emailHash": "hash_123",
    "anonymousId": "anon_123",
    "adId": null,
    "gclid": null,
    "ttclid": null,
    "customerType": "consumer",
    "payload": {
      "value": 49.99,
      "currency": "USD"
    },
    "ingestIp": "203.0.113.10",
    "userAgent": "Mozilla/5.0",
    "deliveryOverallStatus": "failed",
    "deliveries": []
  },
  "replayedDestinations": ["meta"]
}
```

Replay behavior:

- delivery rows are moved to `retrying` before enqueue
- a repeated call does not re-enqueue rows that were already switched to `retrying`
- queue job ids are replay-tagged so replay jobs do not collide with the original delivery jobs

## Constraints

- never expose publicly without authentication and authorization
- do not mix admin concerns with ingestion endpoint behavior
- replay actions must be auditable

## Related docs

- [Runbooks](../07-ops/runbooks.md)
- [Privacy and GDPR](../08-security/privacy-and-gdpr.md)
