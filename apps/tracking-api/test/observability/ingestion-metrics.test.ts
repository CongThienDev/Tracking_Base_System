import { beforeEach, describe, expect, it } from 'vitest';
import { createIngestionMetrics, INGESTION_METRIC_COUNTERS } from '../../src/observability/ingestion-metrics.js';

describe('ingestion-metrics', () => {
  const expectedZeroSnapshot = {
    track_requests_total: 0,
    track_success_total: 0,
    track_validation_error_total: 0,
    track_deduplicated_total: 0,
    track_internal_error_total: 0,
    track_auth_failed_total: 0,
    track_rate_limited_total: 0
  } as const;

  let metrics: ReturnType<typeof createIngestionMetrics>;

  beforeEach(() => {
    metrics = createIngestionMetrics();
  });

  it('starts with zeroed counters', () => {
    expect(metrics.snapshot()).toEqual(expectedZeroSnapshot);
  });

  it('increments counters and recorders update the expected totals', () => {
    metrics.recordTrackRequest();
    metrics.recordSuccess();
    metrics.recordSuccess({ deduplicated: true });
    metrics.recordValidationError();
    metrics.recordInternalError();
    metrics.recordAuthFailed();
    metrics.recordRateLimited();
    metrics.increment('track_requests_total');

    expect(metrics.snapshot()).toEqual({
      track_requests_total: 2,
      track_success_total: 2,
      track_validation_error_total: 1,
      track_deduplicated_total: 1,
      track_internal_error_total: 1,
      track_auth_failed_total: 1,
      track_rate_limited_total: 1
    });
  });

  it('returns an immutable safe copy from snapshot', () => {
    metrics.increment('track_requests_total');

    const snapshot = metrics.snapshot();
    const mutableSnapshot = snapshot as Record<string, number>;
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(() => {
      mutableSnapshot.track_requests_total = 999;
    }).toThrow(TypeError);
    expect(() => {
      mutableSnapshot.track_success_total = 42;
    }).toThrow(TypeError);

    expect(snapshot.track_requests_total).toBe(1);
    expect(snapshot.track_success_total).toBe(0);
    expect(metrics.snapshot()).toEqual({
      track_requests_total: 1,
      track_success_total: 0,
      track_validation_error_total: 0,
      track_deduplicated_total: 0,
      track_internal_error_total: 0,
      track_auth_failed_total: 0,
      track_rate_limited_total: 0
    });
  });

  it('reset clears all counters back to zero', () => {
    metrics.recordTrackRequest();
    metrics.recordSuccess({ deduplicated: true });
    metrics.recordValidationError();

    metrics.reset();

    expect(metrics.snapshot()).toEqual(expectedZeroSnapshot);
  });

  it('rejects unknown counters at runtime', () => {
    expect(() => metrics.increment('track_requests_total')).not.toThrow();
    expect(() => metrics.increment('unknown_counter' as never)).toThrow(
      'Unknown ingestion metric counter: unknown_counter'
    );
    expect(INGESTION_METRIC_COUNTERS).toContain('track_requests_total');
  });
});
