import { Worker } from 'bullmq';
import { createConsoleWorkerLogger, type WorkerLogger } from '../logging/worker-logger.js';
import { createNoopDestinationAdapterRegistry } from '../adapters/noop-destination-adapter.js';
import type { DeliveryJobData } from '../types.js';
import { isRetryableDeliveryError } from '../processor/delivery-errors.js';
import { processDeliveryJob } from '../processor/process-delivery-job.js';
import type { RouterWorkerConfig } from '../config.js';
import { createRedisConnection } from '../queue/redis-connection.js';
import { closeDbPool, getDbPool } from '../db/client.js';
import {
  NoopDeliveryStateWriter,
  PostgresDeliveryStateWriter,
  type DeliveryStateWriter
} from '../state/delivery-state-writer.js';

export type RouterWorkerRuntime = {
  worker: Worker<DeliveryJobData>;
  logger: WorkerLogger;
  close(): Promise<void>;
};

function buildNoopAdapterRegistry(): ReturnType<typeof createNoopDestinationAdapterRegistry> {
  return createNoopDestinationAdapterRegistry(['meta', 'google', 'tiktok']);
}

export function createRouterWorker(config: RouterWorkerConfig): RouterWorkerRuntime {
  const logger = createConsoleWorkerLogger(config.workerName);
  const connection = createRedisConnection(config.redis);
  const adapters = buildNoopAdapterRegistry();

  const deliveryStateWriter: DeliveryStateWriter = config.databaseUrl
    ? new PostgresDeliveryStateWriter(getDbPool(config.databaseUrl))
    : new NoopDeliveryStateWriter();

  if (!config.databaseUrl) {
    logger.warn({ workerName: config.workerName }, 'DATABASE_URL missing; delivery state updates are disabled');
  }

  const worker = new Worker<DeliveryJobData>(
    config.queueName,
    async (job) => {
      const attempt = Math.max(1, job.attemptsMade + 1);
      const maxAttempts = Math.max(1, job.opts.attempts ?? 1);

      await processDeliveryJob(
        {
          id: job.id ?? null,
          queueName: job.queueName,
          attemptsMade: job.attemptsMade,
          attempts: maxAttempts,
          data: job.data
        },
        {
          adapters,
          logger
        }
      );

      try {
        await deliveryStateWriter.write({
          eventId: job.data.eventId,
          destination: job.data.destination,
          attemptCount: attempt,
          status: 'delivered',
          lastResponseSummary: {
            worker: config.workerName
          },
          deliveredAt: new Date(),
          nextAttemptAt: null,
          lastErrorCode: null,
          lastErrorMessage: null
        });
      } catch (error) {
        logger.error(
          {
            eventId: job.data.eventId,
            destination: job.data.destination,
            error: error instanceof Error ? { name: error.name, message: error.message } : { value: error }
          },
          'failed to persist delivered state'
        );
      }
    },
    {
      connection,
      concurrency: config.concurrency
    }
  );

  worker.on('error', (error) => {
    logger.error(
      {
        error: error instanceof Error ? { name: error.name, message: error.message } : { value: error }
      },
      'bullmq worker error'
    );
  });

  worker.on('failed', async (job, error) => {
    const attemptsMade = Math.max(1, (job?.attemptsMade ?? 0) + 1);
    const maxAttempts = Math.max(1, job?.opts.attempts ?? 1);
    const retryable = isRetryableDeliveryError(error);
    const shouldRetry = retryable && attemptsMade < maxAttempts;

    try {
      if (job) {
        await deliveryStateWriter.write({
          eventId: job.data.eventId,
          destination: job.data.destination,
          attemptCount: attemptsMade,
          status: shouldRetry ? 'retrying' : 'failed',
          lastErrorCode: error instanceof Error ? error.name : 'unknown_error',
          lastErrorMessage: error instanceof Error ? error.message : String(error),
          lastResponseSummary: {
            worker: config.workerName,
            retryable,
            shouldRetry
          },
          nextAttemptAt: shouldRetry ? new Date(Date.now() + 1000) : null,
          deliveredAt: null
        });
      }
    } catch (stateError) {
      logger.error(
        {
          jobId: job?.id ?? null,
          eventId: job?.data.eventId ?? null,
          destination: job?.data.destination ?? null,
          error:
            stateError instanceof Error
              ? { name: stateError.name, message: stateError.message }
              : { value: stateError }
        },
        'failed to persist failed state'
      );
    }

    logger.error(
      {
        jobId: job?.id ?? null,
        eventId: job?.data.eventId ?? null,
        destination: job?.data.destination ?? null,
        error: error instanceof Error ? { name: error.name, message: error.message } : { value: error }
      },
      'bullmq job failed'
    );
  });

  logger.info(
    {
      queue: config.queueName,
      workerName: config.workerName,
      concurrency: config.concurrency
    },
    'router worker started'
  );

  return {
    worker,
    logger,
    async close(): Promise<void> {
      await worker.close();
      await closeDbPool();
    }
  };
}
