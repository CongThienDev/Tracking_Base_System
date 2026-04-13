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

## Tracing

At minimum, correlate logs by `event_id` and request ID.

## Alerts

- sustained delivery failure spikes
- queue backlog growth
- ingestion latency breach
- duplicate rate anomaly

## Related docs

- [Runbooks](runbooks.md)
- [Retries and queues](retries-and-queues.md)
