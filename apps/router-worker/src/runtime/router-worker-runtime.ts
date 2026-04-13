import { Worker } from 'bullmq';
import { createConsoleWorkerLogger, type WorkerLogger } from '../logging/worker-logger.js';
import type { DestinationAdapterRegistry } from '../adapters/destination-adapter.js';
import { GoogleConversionAdapter } from '../adapters/google-conversion-adapter.js';
import { MetaConversionsAdapter } from '../adapters/meta-conversions-adapter.js';
import { NoopDestinationAdapter } from '../adapters/noop-destination-adapter.js';
import { TikTokEventsAdapter } from '../adapters/tiktok-events-adapter.js';
import type { DeliveryJobData } from '../types.js';
import { TerminalDeliveryError, isRetryableDeliveryError } from '../processor/delivery-errors.js';
import { processDeliveryJob } from '../processor/process-delivery-job.js';
import type { RouterWorkerConfig } from '../config.js';
import { createRedisConnection } from '../queue/redis-connection.js';
import { closeDbPool, getDbPool } from '../db/client.js';
import { PostgresEventRepository, type EventRepository } from '../db/event-repository.js';
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

function buildAdapterRegistry(config: RouterWorkerConfig, logger: WorkerLogger): DestinationAdapterRegistry {
  let metaAdapter: MetaConversionsAdapter | NoopDestinationAdapter;

  if (config.meta.endpointUrl && config.meta.pixelId && config.meta.accessToken) {
    metaAdapter = new MetaConversionsAdapter({
      endpointUrl: config.meta.endpointUrl,
      pixelId: config.meta.pixelId,
      accessToken: config.meta.accessToken,
      testEventCode: config.meta.testEventCode
    });
  } else {
    metaAdapter = new NoopDestinationAdapter('meta');
  }

  if (metaAdapter instanceof NoopDestinationAdapter) {
    const missingMetaConfig = [
      !config.meta.endpointUrl ? 'meta.endpointUrl' : null,
      !config.meta.pixelId ? 'meta.pixelId' : null,
      !config.meta.accessToken ? 'meta.accessToken' : null
    ].filter((field): field is string => field !== null);

    logger.warn(
      {
        destination: 'meta',
        missingConfig: missingMetaConfig
      },
      'meta config missing; using noop adapter'
    );
  }

  const googleAdapter = config.google.endpointUrl
    ? new GoogleConversionAdapter(config.google.endpointUrl, config.google.apiKey)
    : new NoopDestinationAdapter('google');

  if (!config.google.endpointUrl) {
    logger.warn({ destination: 'google' }, 'google endpoint missing; using noop adapter');
  }

  const tiktokAdapter = config.tiktok.endpointUrl
    ? new TikTokEventsAdapter({
        endpointUrl: config.tiktok.endpointUrl,
        accessToken: config.tiktok.accessToken
      })
    : new NoopDestinationAdapter('tiktok');

  if (!config.tiktok.endpointUrl) {
    logger.warn({ destination: 'tiktok' }, 'tiktok endpoint missing; using noop adapter');
  }

  return Object.freeze({
    meta: metaAdapter,
    google: googleAdapter,
    tiktok: tiktokAdapter
  });
}

export function createRouterWorker(config: RouterWorkerConfig): RouterWorkerRuntime {
  const logger = createConsoleWorkerLogger(config.workerName);
  const connection = createRedisConnection(config.redis);
  const adapters = buildAdapterRegistry(config, logger);
  const dbPool = config.databaseUrl ? getDbPool(config.databaseUrl) : null;

  const deliveryStateWriter: DeliveryStateWriter = dbPool
    ? new PostgresDeliveryStateWriter(dbPool)
    : new NoopDeliveryStateWriter();
  const eventRepository: EventRepository = dbPool
    ? new PostgresEventRepository(dbPool)
    : {
        async getByEventId(): Promise<null> {
          return null;
        }
      };

  if (!config.databaseUrl) {
    logger.warn(
      { workerName: config.workerName },
      'DATABASE_URL missing; canonical event fetch and delivery state updates are disabled'
    );
  }

  const worker = new Worker<DeliveryJobData>(
    config.queueName,
    async (job) => {
      const attempt = Math.max(1, job.attemptsMade + 1);
      const maxAttempts = Math.max(1, job.opts.attempts ?? 1);
      const canonicalEvent = await eventRepository.getByEventId(job.data.eventId);

      if (!canonicalEvent) {
        logger.error(
          {
            queue: job.queueName,
            jobId: job.id,
            eventId: job.data.eventId,
            destination: job.data.destination,
            attempt,
            maxAttempts
          },
          'canonical event not found'
        );

        throw new TerminalDeliveryError(`No canonical event found for event_id "${job.data.eventId}"`);
      }

      await processDeliveryJob(
        {
          id: job.id ?? null,
          queueName: job.queueName,
          attemptsMade: job.attemptsMade,
          attempts: maxAttempts,
          data: job.data,
          event: canonicalEvent
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
