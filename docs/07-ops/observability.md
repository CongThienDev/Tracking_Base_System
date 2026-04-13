# Observability

## What to log

### Ingestion

- request correlation ID
- caller identity or client name
- event_name
- event_id
- validation result
- latency

### Routing

- event_id
- destination
- attempt count
- result status
- retry classification
- vendor response summary where safe

## Metrics

- events received per minute
- validation failure rate
- duplicate event rate
- queue depth
- delivery success rate by destination
- retry rate by destination
- DLQ count
- p95 ingestion latency
- auth failure rate by caller type, with a baseline alert at `> 5%` over 5 minutes
- signature verification failure count, with a baseline alert at `>= 20` failures in 10 minutes for one caller
- rate-limit hit rate, with a baseline alert at `> 2%` of requests sustained for 10 minutes
- delete-by-user success count and delete-by-user failure count
- delete-by-user rows removed per run for `event_deliveries`, `events`, and `users`
- validation script exit status, emitted as a one-shot operational check after changes to deletion logic

## Tracing

At minimum, correlate logs by `event_id`, request ID, caller identity, and auth outcome.

## Alerts

- sustained delivery failure spikes
- queue backlog growth
- ingestion latency breach
- duplicate rate anomaly
- repeated auth rejection spikes for one caller or route
- rate-limit saturation on a single client bucket or IP range
- delete-by-user validation failure after a deployment or migration

## Related docs

- [Runbooks](runbooks.md)
- [Retries and queues](retries-and-queues.md)
