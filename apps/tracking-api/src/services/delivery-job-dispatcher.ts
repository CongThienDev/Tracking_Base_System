import { Queue } from 'bullmq';
import type { JobsOptions, QueueOptions } from 'bullmq';
import type { RedisOptions } from 'ioredis';
import type { NormalizedTrackEvent } from '../types/track.js';

export type DeliveryDestination = 'meta' | 'google' | 'tiktok';

const ROUTER_JOB_NAME = 'deliver-event';
export const SUPPORTED_DELIVERY_DESTINATIONS: readonly DeliveryDestination[] = ['meta', 'google', 'tiktok'];
const DEFAULT_DESTINATIONS: readonly DeliveryDestination[] = SUPPORTED_DELIVERY_DESTINATIONS;

const DEFAULT_JOB_OPTIONS_BY_DESTINATION: Record<DeliveryDestination, JobsOptions> = {
  meta: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: 1000,
    removeOnFail: 5000
  },
  google: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1500
    },
    removeOnComplete: 1000,
    removeOnFail: 5000
  },
  tiktok: {
    attempts: 4,
    backoff: {
      type: 'exponential',
      delay: 1200
    },
    removeOnComplete: 1000,
    removeOnFail: 5000
  }
};

const DEFAULT_QUEUE_JOB_OPTIONS: JobsOptions = {
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

export type DeliveryJobQueue = Pick<Queue<DeliveryJobPayload>, 'add' | 'close'>;

export interface DeliveryJobDispatcher {
  enqueueDeliveryJob(event: NormalizedTrackEvent): Promise<void>;
  enqueueDeliveryJobs(input: {
    eventId: string;
    destinations: readonly DeliveryDestination[];
    replayTag?: string;
  }): Promise<void>;
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

export function getDeliveryJobOptions(destination: DeliveryDestination): JobsOptions {
  return DEFAULT_JOB_OPTIONS_BY_DESTINATION[destination];
}

class BullMqDeliveryJobDispatcher implements DeliveryJobDispatcher {
  constructor(
    private readonly queue: DeliveryJobQueue,
    private readonly destinations: readonly DeliveryDestination[]
  ) {}

  private buildJobId(eventId: string, destination: DeliveryDestination, replayTag?: string): string {
    const eventPart = encodeURIComponent(eventId);
    const destinationPart = encodeURIComponent(destination);
    const replayPart = replayTag ? `__replay__${encodeURIComponent(replayTag)}` : '';
    return `${eventPart}__${destinationPart}${replayPart}`;
  }

  async enqueueDeliveryJobs(input: {
    eventId: string;
    destinations: readonly DeliveryDestination[];
    replayTag?: string;
  }): Promise<void> {
    const requestedAt = new Date().toISOString();

    await Promise.all(
      input.destinations.map(async (destination) => {
        const jobId = this.buildJobId(input.eventId, destination, input.replayTag);
        await this.queue.add(
          ROUTER_JOB_NAME,
          {
            eventId: input.eventId,
            destination,
            requestedAt,
            payloadVersion: 1
          },
          {
            ...getDeliveryJobOptions(destination),
            jobId
          }
        );
      })
    );
  }

  async enqueueDeliveryJob(event: NormalizedTrackEvent): Promise<void> {
    await this.enqueueDeliveryJobs({
      eventId: event.eventId,
      destinations: this.destinations
    });
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}

export class NoopDeliveryJobDispatcher implements DeliveryJobDispatcher {
  async enqueueDeliveryJob(): Promise<void> {
    return;
  }

  async enqueueDeliveryJobs(): Promise<void> {
    return;
  }

  async close(): Promise<void> {
    return;
  }
}

export function createDeliveryJobDispatcher(
  queue: DeliveryJobQueue,
  destinations: readonly DeliveryDestination[] = DEFAULT_DESTINATIONS
): DeliveryJobDispatcher {
  return new BullMqDeliveryJobDispatcher(queue, destinations);
}

export function createBullMqDeliveryJobDispatcher(config: BullMqDispatcherConfig): DeliveryJobDispatcher {
  const queueOptions: QueueOptions = {
    connection: toRedisOptions(config.redis),
    defaultJobOptions: DEFAULT_QUEUE_JOB_OPTIONS
  };

  const queue = new Queue<DeliveryJobPayload>(config.queueName, queueOptions);
  const destinations = config.destinations ?? DEFAULT_DESTINATIONS;

  return createDeliveryJobDispatcher(queue, destinations);
}
