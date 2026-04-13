# Meta Conversions API

## Purpose

Deliver stored canonical events to Meta using Conversions API while preserving browser and server deduplication compatibility.

## Supported event mapping

| Internal event | Meta event |
| --- | --- |
| `page_view` | `PageView` |
| `view_content` | `ViewContent` |
| `add_to_cart` | `AddToCart` |
| `initiate_checkout` | `InitiateCheckout` |
| `purchase` | `Purchase` |

Custom events may be mapped as custom names if approved.

## Required outbound fields

- `event_name`
- `event_time`
- `event_id`
- `action_source`
- `user_data`

## `user_data` expectations

- hashed email when available
- client IP address
- client user agent

## Deduplication rule

If the frontend repo also fires `fbq`, it must use the same `event_id` value as the server-side event. This is mandatory for reliable Meta deduplication.

## Example payload

```json
{
  "data": [
    {
      "event_name": "Purchase",
      "event_time": 1776074400,
      "event_id": "9b35c3c8-52b6-41bd-9327-1ff38a76a4de",
      "action_source": "website",
      "user_data": {
        "em": ["sha256-email"],
        "client_ip_address": "203.0.113.1",
        "client_user_agent": "Mozilla/5.0"
      },
      "custom_data": {
        "currency": "USD",
        "value": 49.99
      }
    }
  ]
}
```

## Config

- `META_PIXEL_ID`
- `META_ACCESS_TOKEN`
- optional test event code per environment

## Related docs

- [Event contract](../03-data/event-contract.md)
- [Deduplication](../03-data/deduplication.md)
- [Frontend tracking SDK](../06-frontend/tracking-sdk.md)
