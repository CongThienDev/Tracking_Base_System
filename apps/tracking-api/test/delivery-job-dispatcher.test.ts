import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDeliveryJobDispatcher,
  getDeliveryJobOptions,
  type DeliveryJobQueue,
  type DeliveryDestination
} from '../src/services/delivery-job-dispatcher.js';
import type { NormalizedTrackEvent } from '../src/types/track.js';

type AddCall = Parameters<DeliveryJobQueue['add']>;

function makeEvent(eventId = 'evt-001'): NormalizedTrackEvent {
  return {
    eventId,
    eventName: 'purchase',
    eventTimestamp: new Date('2026-04-13T00:00:00.000Z'),
    userId: 'user-001',
    emailHash: null,
    anonymousId: null,
    sessionId: 'sess-001',
    source: null,
    campaign: null,
    adId: null,
    gclid: null,
    ttclid: null,
    eventValue: null,
    currency: null,
    payload: {},
    ingestIp: null,
    userAgent: null
  };
}

describe('delivery-job-dispatcher', () => {
  let add: ReturnType<typeof vi.fn>;
  let close: ReturnType<typeof vi.fn>;
  let queue: DeliveryJobQueue;

  beforeEach(() => {
    add = vi.fn(async () => undefined);
    close = vi.fn(async () => undefined);
    queue = { add, close };
  });

  it('uses destination-specific retry policies', () => {
    expect(getDeliveryJobOptions('meta')).toMatchObject({
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      removeOnComplete: 1000,
      removeOnFail: 5000
    });

    expect(getDeliveryJobOptions('google')).toMatchObject({
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1500
      },
      removeOnComplete: 1000,
      removeOnFail: 5000
    });

    expect(getDeliveryJobOptions('tiktok')).toMatchObject({
      attempts: 4,
      backoff: {
        type: 'exponential',
        delay: 1200
      },
      removeOnComplete: 1000,
      removeOnFail: 5000
    });
  });

  it('passes destination-specific job options to the queue and keeps job ids stable', async () => {
    const dispatcher = createDeliveryJobDispatcher(queue, ['meta', 'google', 'tiktok']);
    const event = makeEvent('evt-123');

    await dispatcher.enqueueDeliveryJob(event);

    expect(add).toHaveBeenCalledTimes(3);

    const calls = add.mock.calls as AddCall[];
    const destinations: DeliveryDestination[] = ['meta', 'google', 'tiktok'];

    for (const [index, destination] of destinations.entries()) {
      const call = calls[index];
      expect(call[0]).toBe('deliver-event');
      expect(call[1]).toMatchObject({
        eventId: 'evt-123',
        destination,
        requestedAt: expect.any(String),
        payloadVersion: 1
      });
      expect(call[2]).toMatchObject({
        ...getDeliveryJobOptions(destination),
        jobId: `evt-123:${destination}`
      });
    }
  });
});
