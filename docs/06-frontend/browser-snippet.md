# Browser Snippet

## Purpose

Provide a simple integration path for a frontend repository that does not want a package dependency.

## Requirements

The snippet must:

- bootstrap `session_id`
- generate `event_id`
- send `page_view` automatically
- expose a global `track()` function or equivalent wrapper

## Example shape

```html
<script>
  window.track = function(eventName, eventData) {
    // generate event_id, reuse session_id, POST /track
  };
</script>
```

## Guidance

Keep the snippet small, explicit, and vendor-agnostic. Its first duty is sending data to this service, not to Meta directly.

## Related docs

- [Tracking SDK](tracking-sdk.md)
- [Tracking API](../04-api/tracking-api.md)
