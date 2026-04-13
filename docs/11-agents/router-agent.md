# Router Agent

## Scope

Work on destination selection, job creation, worker delivery, retries, and replay safety.

## Checklist

- one delivery record per `event_id` and destination
- preserve `event_id` unchanged
- classify retryable vs terminal failures
- keep routing async and idempotent

## Read first

- [Router API](../04-api/router-api.md)
- [Retries and queues](../07-ops/retries-and-queues.md)
- [Meta integration](../05-integrations/meta-capi.md)
