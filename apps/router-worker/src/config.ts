import 'dotenv/config';

import {
  DEFAULT_WORKER_CONCURRENCY,
  ROUTER_QUEUE_NAME,
  ROUTER_WORKER_NAME
} from './queue/constants.js';
import type { RedisConnectionConfig } from './queue/redis-connection.js';

export type RouterWorkerConfig = {
  databaseUrl?: string;
  redis: RedisConnectionConfig;
  queueName: string;
  workerName: string;
  concurrency: number;
  google: {
    endpointUrl?: string;
    apiKey?: string;
  };
  tiktok: {
    endpointUrl?: string;
    accessToken?: string;
  };
};

function parsePositiveInteger(value: string | undefined, fallback: number, fieldName: string): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return parsed;
}

export function getRouterWorkerConfig(): RouterWorkerConfig {
  const redisUrl = process.env.REDIS_URL?.trim();
  const queueName = process.env.ROUTER_QUEUE_NAME?.trim() || ROUTER_QUEUE_NAME;
  const workerName = process.env.ROUTER_WORKER_NAME?.trim() || ROUTER_WORKER_NAME;

  if (!redisUrl && !process.env.REDIS_HOST?.trim()) {
    throw new Error('REDIS_URL or REDIS_HOST is required');
  }

  return {
    databaseUrl: process.env.DATABASE_URL?.trim() || undefined,
    redis: {
      url: redisUrl || undefined,
      host: process.env.REDIS_HOST?.trim() || undefined,
      port: process.env.REDIS_PORT ? parsePositiveInteger(process.env.REDIS_PORT, 6379, 'REDIS_PORT') : undefined,
      username: process.env.REDIS_USERNAME?.trim() || undefined,
      password: process.env.REDIS_PASSWORD?.trim() || undefined,
      db: process.env.REDIS_DB ? parsePositiveInteger(process.env.REDIS_DB, 0, 'REDIS_DB') : undefined,
      connectionName: workerName,
      lazyConnect: true
    },
    queueName,
    workerName,
    concurrency: parsePositiveInteger(process.env.ROUTER_WORKER_CONCURRENCY, DEFAULT_WORKER_CONCURRENCY, 'ROUTER_WORKER_CONCURRENCY'),
    google: {
      endpointUrl: process.env.GOOGLE_CONVERSIONS_ENDPOINT_URL?.trim() || undefined,
      apiKey: process.env.GOOGLE_CONVERSIONS_API_KEY?.trim() || undefined
    },
    tiktok: {
      endpointUrl: process.env.TIKTOK_EVENTS_ENDPOINT_URL?.trim() || undefined,
      accessToken: process.env.TIKTOK_ACCESS_TOKEN?.trim() || undefined
    }
  };
}
