# Tracking SDK

## Purpose

Define the lightweight client contract that another frontend repository can embed or implement.

## Required behavior

- automatically send `page_view` on first page load
- expose `track(event_name, event_data, options?)`
- generate and persist `session_id`
- rotate the session after 30 minutes of inactivity
- generate `event_id` for each event
- include the same `event_id` in any matching browser pixel callback or browser pixel send path
- fail silently when the API is unavailable

## Example API

```js
track('add_to_cart', { value: 49, currency: 'USD' });
```

## Session handling

- create session on first visit
- persist via localStorage or cookie
- rotate after 30 minutes inactivity
- keep the session stable across active navigation until the inactivity window expires

## Event propagation

- generate one `event_id` per emitted event
- reuse that exact `event_id` in the browser pixel callback for the same event so server and browser delivery can deduplicate
- do not regenerate the id inside the pixel callback path

## Identity handling

The SDK should send the strongest available identity without blocking the UI:

- `user_id` if known
- hashed email if already available from the caller boundary
- `anonymous_id` otherwise

## Browser safety

- do not throw uncaught errors in the page runtime
- queue or drop safely if transport fails
- avoid large dependencies

## Related docs

- [Browser snippet](browser-snippet.md)
- [Session and storage](session-and-storage.md)
- [Tracking API](../04-api/tracking-api.md)
