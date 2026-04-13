import type { DestinationAdapterRegistry } from '../adapters/destination-adapter.js';
import { TerminalDeliveryError, isRetryableDeliveryError } from './delivery-errors.js';
import type { WorkerLogger } from '../logging/worker-logger.js';
import type { DeliveryJobEnvelope } from '../types.js';

export type ProcessDeliveryJobDependencies = {
  adapters: DestinationAdapterRegistry;
  logger: WorkerLogger;
};

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null
    };
  }

  return {
    value: error
  };
}

export async function processDeliveryJob(job: DeliveryJobEnvelope, dependencies: ProcessDeliveryJobDependencies): Promise<void> {
  const attempt = Math.max(1, job.attemptsMade + 1);
  const maxAttempts = Math.max(1, job.attempts);
  const logContext = {
    queue: job.queueName,
    jobId: job.id,
    eventId: job.data.eventId,
    destination: job.data.destination,
    attempt,
    maxAttempts,
    requestedAt: job.data.requestedAt
  };

  const adapter = dependencies.adapters[job.data.destination];

  if (!adapter) {
    dependencies.logger.error(
      {
        ...logContext,
        reason: 'destination_adapter_missing'
      },
      'no destination adapter registered'
    );
    throw new TerminalDeliveryError(`No destination adapter registered for destination "${job.data.destination}"`);
  }

  dependencies.logger.info(logContext, 'delivery job started');

  try {
    await adapter.deliver(job);
    dependencies.logger.info(logContext, 'delivery job completed');
  } catch (error) {
    const retryable = isRetryableDeliveryError(error);
    const shouldRetry = retryable && attempt < maxAttempts;

    const failureContext = {
      ...logContext,
      retryable,
      shouldRetry,
      error: serializeError(error)
    };

    if (shouldRetry) {
      dependencies.logger.warn(failureContext, 'delivery job failed and will be retried');
    } else {
      dependencies.logger.error(failureContext, 'delivery job failed permanently');
    }

    throw error;
  }
}
