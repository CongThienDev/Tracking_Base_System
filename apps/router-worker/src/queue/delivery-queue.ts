import { Queue } from 'bullmq';
import type { RedisOptions } from 'ioredis';
import { ROUTER_QUEUE_NAME, ROUTER_JOB_NAME } from './constants.js';
import type { DeliveryJobData } from '../types.js';

export function createDeliveryQueue(connection: RedisOptions): Queue<DeliveryJobData> {
  return new Queue<DeliveryJobData>(ROUTER_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      removeOnComplete: 1000,
      removeOnFail: 5000
    }
  });
}

export function getDeliveryJobName(): typeof ROUTER_JOB_NAME {
  return ROUTER_JOB_NAME;
}
