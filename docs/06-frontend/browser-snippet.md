# Browser Snippet

## Purpose

Provide a simple integration path for a frontend repository that does not want a package dependency.

## Requirements

The snippet must:

- bootstrap `session_id`
- expire or rotate the session after 30 minutes of inactivity
- generate `event_id`
- send `page_view` automatically on first load
- expose a global `track()` function or equivalent wrapper
- pass the same `event_id` into any browser pixel callback for that event

## Example shape

```html
<script>
  window.track = function(eventName, eventData, options) {
    // generate event_id once, reuse session_id, POST /track,
    // and hand the same event_id to any browser pixel callback
  };
</script>
```

## Guidance

Keep the snippet small, explicit, and vendor-agnostic. Its first duty is sending data to this service, not to Meta directly.

## Related docs

- [Tracking SDK](tracking-sdk.md)
- [Tracking API](../04-api/tracking-api.md)
