# Google Ads

## Purpose

Deliver eligible conversion events to Google Ads from the canonical stored event record.

## Core requirements

- include conversion value
- include currency
- include `gclid` when available
- preserve canonical `event_id` in logs and any supported dedup fielding

## Mapping stance

`purchase` is the primary conversion candidate in MVP.

Additional events such as `add_to_cart` or `initiate_checkout` may be added later if campaign strategy requires them.

## Constraints

- Google Ads support differs by integration mode and account setup
- `gclid` presence materially affects attribution usefulness
- the system should not invent click identifiers

## Example internal mapping output

```json
{
  "event_id": "9b35c3c8-52b6-41bd-9327-1ff38a76a4de",
  "conversion_action": "purchase",
  "gclid": "optional-click-id",
  "conversion_value": 49.99,
  "currency_code": "USD",
  "conversion_date_time": "2026-04-13 17:00:00+07:00"
}
```

## Related docs

- [Event contract](../03-data/event-contract.md)
- [Tracking API](../04-api/tracking-api.md)
- [Configuration](../07-ops/configuration.md)
