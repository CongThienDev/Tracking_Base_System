# Load Tests

## MVP target

Handle at least 100 events per second without violating ingestion latency targets.

## Measure

- p50 and p95 response latency
- DB write saturation
- queue depth over time
- worker throughput by destination
- error and retry rate under load

## Related docs

- [Requirements](../01-product/requirements.md)
- [Observability](../07-ops/observability.md)
