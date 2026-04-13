import { beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import {
  createLoggerSpy,
  InMemoryEventRepository,
  RecordingDeliveryJobDispatcher
} from './support/fakes.js';

describe('POST /track', () => {
  let repository: InMemoryEventRepository;

  beforeEach(() => {
    repository = new InMemoryEventRepository();
  });

  it('stores a valid event and returns event_id', async () => {
    const deliveryJobDispatcher = new RecordingDeliveryJobDispatcher();
    const logger = createLoggerSpy();
    const app = buildApp({
      eventRepository: repository,
      deliveryJobDispatcher,
      logger
    });

    const response = await app.inject({
      method: 'POST',
      url: '/track',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'vitest-agent'
      },
      payload: {
        event_id: 'evt-001',
        event_name: 'purchase',
        session: {
          session_id: 'sess-001'
        },
        event_data: {
          value: 49.99,
          currency: 'USD'
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      event_id: 'evt-001',
      deduplicated: false
    });
    expect(repository.count()).toBe(1);
    expect(deliveryJobDispatcher.count()).toBe(1);
    expect(deliveryJobDispatcher.lastEvent()).toMatchObject({
      eventId: 'evt-001',
      eventName: 'purchase'
    });
    expect(logger.error).not.toHaveBeenCalled();

    await app.close();
  });

  it('deduplicates duplicate event_id requests', async () => {
    const deliveryJobDispatcher = new RecordingDeliveryJobDispatcher();
    const logger = createLoggerSpy();
    const app = buildApp({
      eventRepository: repository,
      deliveryJobDispatcher,
      logger
    });

    const payload = {
      event_id: 'evt-dup-001',
      event_name: 'purchase',
      session: {
        session_id: 'sess-dup-001'
      }
    };

    const first = await app.inject({
      method: 'POST',
      url: '/track',
      headers: { 'content-type': 'application/json' },
      payload
    });

    const second = await app.inject({
      method: 'POST',
      url: '/track',
      headers: { 'content-type': 'application/json' },
      payload
    });

    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ deduplicated: false });

    expect(second.statusCode).toBe(200);
    expect(second.json()).toMatchObject({
      status: 'ok',
      event_id: 'evt-dup-001',
      deduplicated: true
    });

    expect(repository.count()).toBe(1);
    expect(deliveryJobDispatcher.count()).toBe(1);
    expect(deliveryJobDispatcher.lastEvent()).toMatchObject({
      eventId: 'evt-dup-001'
    });
    expect(logger.error).not.toHaveBeenCalled();

    await app.close();
  });

  it('returns validation error for missing session_id', async () => {
    const deliveryJobDispatcher = new RecordingDeliveryJobDispatcher();
    const logger = createLoggerSpy();
    const app = buildApp({
      eventRepository: repository,
      deliveryJobDispatcher,
      logger
    });

    const response = await app.inject({
      method: 'POST',
      url: '/track',
      headers: { 'content-type': 'application/json' },
      payload: {
        event_name: 'purchase',
        session: {}
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      status: 'error',
      code: 'validation_error'
    });
    expect(deliveryJobDispatcher.count()).toBe(0);
    expect(logger.error).not.toHaveBeenCalled();

    await app.close();
  });

  it('does not fail ingestion when enqueue fails', async () => {
    const deliveryJobDispatcher = new RecordingDeliveryJobDispatcher({ fail: true });
    const logger = createLoggerSpy();
    const app = buildApp({
      eventRepository: repository,
      deliveryJobDispatcher,
      logger
    });

    const response = await app.inject({
      method: 'POST',
      url: '/track',
      headers: {
        'content-type': 'application/json'
      },
      payload: {
        event_id: 'evt-queue-fail-001',
        event_name: 'purchase',
        session: {
          session_id: 'sess-queue-fail-001'
        }
      }
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      event_id: 'evt-queue-fail-001',
      deduplicated: false
    });
    expect(repository.count()).toBe(1);
    expect(deliveryJobDispatcher.count()).toBe(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        err: expect.any(Error),
        eventId: 'evt-queue-fail-001'
      }),
      'failed to enqueue delivery job'
    );

    await app.close();
  });
});
