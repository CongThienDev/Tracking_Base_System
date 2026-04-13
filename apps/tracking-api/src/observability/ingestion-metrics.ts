export const INGESTION_METRIC_COUNTERS = [
  'track_requests_total',
  'track_success_total',
  'track_validation_error_total',
  'track_deduplicated_total',
  'track_internal_error_total',
  'track_auth_failed_total',
  'track_rate_limited_total'
] as const;

export type IngestionMetricCounterName = (typeof INGESTION_METRIC_COUNTERS)[number];

export type IngestionMetricsSnapshot = Readonly<Record<IngestionMetricCounterName, number>>;

export type RecordSuccessOptions = {
  deduplicated?: boolean;
};

type MutableIngestionMetricsSnapshot = Record<IngestionMetricCounterName, number>;

function createZeroedCounters(): MutableIngestionMetricsSnapshot {
  return {
    track_requests_total: 0,
    track_success_total: 0,
    track_validation_error_total: 0,
    track_deduplicated_total: 0,
    track_internal_error_total: 0,
    track_auth_failed_total: 0,
    track_rate_limited_total: 0
  };
}

export class InMemoryIngestionMetrics {
  private readonly counters: MutableIngestionMetricsSnapshot;

  constructor(initialCounters?: Partial<MutableIngestionMetricsSnapshot>) {
    this.counters = {
      ...createZeroedCounters(),
      ...initialCounters
    };
  }

  increment(counterName: IngestionMetricCounterName): void {
    if (!(counterName in this.counters)) {
      throw new Error(`Unknown ingestion metric counter: ${counterName}`);
    }

    this.counters[counterName] += 1;
  }

  snapshot(): IngestionMetricsSnapshot {
    return Object.freeze({ ...this.counters });
  }

  reset(): void {
    Object.assign(this.counters, createZeroedCounters());
  }

  recordTrackRequest(): void {
    this.increment('track_requests_total');
  }

  recordSuccess(options: RecordSuccessOptions = {}): void {
    this.increment('track_success_total');

    if (options.deduplicated === true) {
      this.increment('track_deduplicated_total');
    }
  }

  recordValidationError(): void {
    this.increment('track_validation_error_total');
  }

  recordInternalError(): void {
    this.increment('track_internal_error_total');
  }

  recordAuthFailed(): void {
    this.increment('track_auth_failed_total');
  }

  recordRateLimited(): void {
    this.increment('track_rate_limited_total');
  }
}

export function createIngestionMetrics(
  initialCounters?: Partial<MutableIngestionMetricsSnapshot>
): InMemoryIngestionMetrics {
  return new InMemoryIngestionMetrics(initialCounters);
}
