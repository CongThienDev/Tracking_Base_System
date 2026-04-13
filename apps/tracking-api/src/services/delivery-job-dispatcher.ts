import { Queue } from 'bullmq';
import type { JobsOptions, QueueOptions } from 'bullmq';
import type { RedisOptions } from 'ioredis';
import type { NormalizedTrackEvent } from '../types/track.js';

export type DeliveryDestination = 'meta' | 'google' | 'tiktok';

const ROUTER_JOB_NAME = 'deliver-event';
const DEFAULT_DESTINATIONS: readonly DeliveryDestination[] = ['meta', 'google', 'tiktok'];

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000
  },
  removeOnComplete: 1000,
  removeOnFail: 5000
};

type DeliveryJobPayload = {
  eventId: string;
  destination: DeliveryDestination;
  requestedAt: string;
  payloadVersion: number;
};

export interface DeliveryJobDispatcher {
  enqueueDeliveryJob(event: NormalizedTrackEvent): Promise<void>;
  close?(): Promise<void>;
}

export type BullMqDispatcherConfig = {
  queueName: string;
  redis: {
    url?: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    db?: number;
  };
  destinations?: readonly DeliveryDestination[];
};

function toRedisOptions(config: BullMqDispatcherConfig['redis']): RedisOptions {
  if (config.url) {
    const parsedUrl = new URL(config.url);
    const parsedDb = parsedUrl.pathname.length > 1 ? Number.parseInt(parsedUrl.pathname.slice(1), 10) : undefined;

    return {
      host: parsedUrl.hostname,
      port: parsedUrl.port ? Number.parseInt(parsedUrl.port, 10) : 6379,
      username: parsedUrl.username || undefined,
      password: parsedUrl.password || undefined,
      db: Number.isInteger(parsedDb) ? parsedDb : config.db,
      enableReadyCheck: false,
      lazyConnect: true,
      maxRetriesPerRequest: null,
      tls: parsedUrl.protocol === 'rediss:' ? {} : undefined
    };
  }

  return {
    host: config.host ?? '127.0.0.1',
    port: config.port ?? 6379,
    username: config.username,
    password: config.password,
    db: config.db,
    enableReadyCheck: false,
    lazyConnect: true,
    maxRetriesPerRequest: null
  };
}

class BullMqDeliveryJobDispatcher implements DeliveryJobDispatcher {
  constructor(
    private readonly queue: Queue<DeliveryJobPayload>,
    private readonly destinations: readonly DeliveryDestination[]
  ) {}

  async enqueueDeliveryJob(event: NormalizedTrackEvent): Promise<void> {
    const requestedAt = new Date().toISOString();

    await Promise.all(
      this.destinations.map(async (destination) => {
        const jobId = `${event.eventId}:${destination}`;
        await this.queue.add(
          ROUTER_JOB_NAME,
          {
            eventId: event.eventId,
            destination,
            requestedAt,
            payloadVersion: 1
          },
          {
            ...DEFAULT_JOB_OPTIONS,
            jobId
          }
        );
      })
    );
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}

export class NoopDeliveryJobDispatcher implements DeliveryJobDispatcher {
  async enqueueDeliveryJob(): Promise<void> {
    return;
  }

  async close(): Promise<void> {
    return;
  }
}

export function createBullMqDeliveryJobDispatcher(config: BullMqDispatcherConfig): DeliveryJobDispatcher {
  const queueOptions: QueueOptions = {
    connection: toRedisOptions(config.redis),
    defaultJobOptions: DEFAULT_JOB_OPTIONS
  };

  const queue = new Queue<DeliveryJobPayload>(config.queueName, queueOptions);
  const destinations = config.destinations ?? DEFAULT_DESTINATIONS;

  return new BullMqDeliveryJobDispatcher(queue, destinations);
}
