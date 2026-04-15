import { beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config.js';
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

  function buildTestConfig(overrides: Partial<AppConfig> = {}): AppConfig {
    return {
      nodeEnv: 'test',
      port: 0,
      databaseUrl: 'postgres://unused',
      cors: {
        allowOrigins: []
      },
      observability: {
        metricsEnabled: true
      },
      security: {
        authMode: 'off',
        authSecret: 'top-secret',
        signatureSkewSeconds: 300,
        rateLimit: {
          enabled: false,
          windowMs: 60_000,
          maxRequests: 100
        }
      },
      routerQueue: {
        queueName: 'router-deliveries',
        redis: {}
      },
      ...overrides
    };
  }

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

  it('rejects unauthenticated request when shared-secret mode is enabled', async () => {
    const deliveryJobDispatcher = new RecordingDeliveryJobDispatcher();
    const logger = createLoggerSpy();
    const app = buildApp({
      eventRepository: repository,
      deliveryJobDispatcher,
      logger,
      config: buildTestConfig({
        security: {
          authMode: 'shared-secret',
          authSecret: 'top-secret',
          signatureSkewSeconds: 300,
          rateLimit: {
            enabled: false,
            windowMs: 60_000,
            maxRequests: 100
          }
        }
      })
    });

    const response = await app.inject({
      method: 'POST',
      url: '/track',
      headers: {
        'content-type': 'application/json'
      },
      payload: {
        event_id: 'evt-auth-001',
        event_name: 'purchase',
        session: {
          session_id: 'sess-auth-001'
        }
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      status: 'error',
      code: 'unauthorized'
    });
    expect(repository.count()).toBe(0);

    await app.close();
  });

  it('handles CORS preflight for allowed origin on /track', async () => {
    const app = buildApp({
      eventRepository: repository,
      deliveryJobDispatcher: new RecordingDeliveryJobDispatcher(),
      logger: createLoggerSpy(),
      config: buildTestConfig({
        cors: {
          allowOrigins: ['http://localhost:5173']
        }
      })
    });

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/track',
      headers: {
        origin: 'http://localhost:5173'
      }
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-methods']).toBe('POST,OPTIONS');
    expect(response.headers['access-control-allow-headers']).toContain('x-tracking-secret');

    await app.close();
  });

  it('returns CORS headers on POST /track for allowed origin', async () => {
    const app = buildApp({
      eventRepository: repository,
      deliveryJobDispatcher: new RecordingDeliveryJobDispatcher(),
      logger: createLoggerSpy(),
      config: buildTestConfig({
        cors: {
          allowOrigins: ['http://localhost:5173']
        }
      })
    });

    const response = await app.inject({
      method: 'POST',
      url: '/track',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:5173'
      },
      payload: {
        event_id: 'evt-cors-001',
        event_name: 'purchase',
        session: {
          session_id: 'sess-cors-001'
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    await app.close();
  });

  it('rate limits excessive requests when limiter is enabled', async () => {
    const deliveryJobDispatcher = new RecordingDeliveryJobDispatcher();
    const logger = createLoggerSpy();
    const app = buildApp({
      eventRepository: repository,
      deliveryJobDispatcher,
      logger,
      config: buildTestConfig({
        security: {
          authMode: 'off',
          signatureSkewSeconds: 300,
          rateLimit: {
            enabled: true,
            windowMs: 60_000,
            maxRequests: 1
          }
        }
      })
    });

    const first = await app.inject({
      method: 'POST',
      url: '/track',
      headers: {
        'content-type': 'application/json'
      },
      payload: {
        event_id: 'evt-rate-001',
        event_name: 'purchase',
        session: {
          session_id: 'sess-rate-001'
        }
      }
    });

    const second = await app.inject({
      method: 'POST',
      url: '/track',
      headers: {
        'content-type': 'application/json'
      },
      payload: {
        event_id: 'evt-rate-002',
        event_name: 'purchase',
        session: {
          session_id: 'sess-rate-002'
        }
      }
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(429);
    expect(second.headers['retry-after']).toBeDefined();

    await app.close();
  });

  it('exposes ingestion counters on /metrics', async () => {
    const deliveryJobDispatcher = new RecordingDeliveryJobDispatcher();
    const logger = createLoggerSpy();
    const app = buildApp({
      eventRepository: repository,
      deliveryJobDispatcher,
      logger,
      config: buildTestConfig()
    });

    await app.inject({
      method: 'POST',
      url: '/track',
      headers: {
        'content-type': 'application/json'
      },
      payload: {
        event_id: 'evt-metrics-001',
        event_name: 'purchase',
        session: {
          session_id: 'sess-metrics-001'
        }
      }
    });

    const metricsResponse = await app.inject({
      method: 'GET',
      url: '/metrics'
    });

    expect(metricsResponse.statusCode).toBe(200);
    expect(metricsResponse.json()).toMatchObject({
      status: 'ok',
      counters: {
        track_requests_total: 1,
        track_success_total: 1
      }
    });

    await app.close();
  });
});
