import { describe, expect, it } from 'vitest';
import { NoopDestinationAdapter } from '../src/adapters/noop-destination-adapter.js';
import { RetryableDeliveryError, TerminalDeliveryError } from '../src/processor/delivery-errors.js';
import { processDeliveryJob } from '../src/processor/process-delivery-job.js';
import type { DeliveryJobEnvelope } from '../src/types.js';
import type { WorkerLogger } from '../src/logging/worker-logger.js';

class RecordingLogger implements WorkerLogger {
  public readonly entries: Array<{ level: 'info' | 'warn' | 'error'; message: string; meta: Record<string, unknown> }> = [];

  info(meta: Record<string, unknown>, message: string): void {
    this.entries.push({ level: 'info', message, meta });
  }

  warn(meta: Record<string, unknown>, message: string): void {
    this.entries.push({ level: 'warn', message, meta });
  }

  error(meta: Record<string, unknown>, message: string): void {
    this.entries.push({ level: 'error', message, meta });
  }
}

function buildJob(overrides: Partial<DeliveryJobEnvelope> = {}): DeliveryJobEnvelope {
  const defaults: DeliveryJobEnvelope = {
    id: 'job-001',
    queueName: 'router-deliveries',
    attemptsMade: 0,
    attempts: 3,
    data: {
      eventId: 'evt-001',
      destination: 'meta',
      requestedAt: '2026-04-13T10:00:00.000Z'
    }
  };

  return {
    ...defaults,
    ...overrides,
    data: {
      ...defaults.data,
      ...overrides.data
    }
  };
}

describe('processDeliveryJob', () => {
  it('logs start and completion for a successful delivery', async () => {
    const logger = new RecordingLogger();
    const adapter = new NoopDestinationAdapter('meta');

    await processDeliveryJob(buildJob(), {
      adapters: {
        meta: adapter
      },
      logger
    });

    expect(logger.entries.map((entry) => entry.message)).toEqual([
      'delivery job started',
      'delivery job completed'
    ]);
    expect(logger.entries.every((entry) => entry.level === 'info')).toBe(true);
  });

  it('logs a retryable failure as warn when attempts remain', async () => {
    const logger = new RecordingLogger();

    await expect(
      processDeliveryJob(buildJob(), {
        adapters: {
          meta: {
            destination: 'meta',
            async deliver(): Promise<void> {
              throw new RetryableDeliveryError('temporary outage');
            }
          }
        },
        logger
      })
    ).rejects.toBeInstanceOf(RetryableDeliveryError);

    expect(logger.entries.at(-1)).toMatchObject({
      level: 'warn',
      message: 'delivery job failed and will be retried'
    });
  });

  it('fails permanently for missing adapters', async () => {
    const logger = new RecordingLogger();

    await expect(
      processDeliveryJob(buildJob({ data: { destination: 'google' } }), {
        adapters: {},
        logger
      })
    ).rejects.toBeInstanceOf(TerminalDeliveryError);

    expect(logger.entries.at(-1)).toMatchObject({
      level: 'error',
      message: 'no destination adapter registered'
    });
  });
});
