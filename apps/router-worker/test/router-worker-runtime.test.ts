import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TerminalDeliveryError } from '../src/processor/delivery-errors.js';
import type { CanonicalEventRecord, DeliveryJobData } from '../src/types.js';
import type { RouterWorkerConfig } from '../src/config.js';

const runtimeMocks = vi.hoisted(() => {
  const workerInstances: Array<{
    processor: (job: BullJobLike) => Promise<void>;
    close: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
  }> = [];
  const repositoryInstances: Array<{
    getByEventId: ReturnType<typeof vi.fn>;
  }> = [];
  const adapterDeliver = vi.fn();
  const write = vi.fn().mockResolvedValue(undefined);
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  };
  const getDbPool = vi.fn(() => ({ query: vi.fn() }));
  const closeDbPool = vi.fn().mockResolvedValue(undefined);
  const fetch = vi.fn();

  return {
    workerInstances,
    repositoryInstances,
    adapterDeliver,
    write,
    logger,
    getDbPool,
    closeDbPool,
    fetch
  };
});

type BullJobLike = {
  id: string | null;
  queueName: string;
  attemptsMade: number;
  opts: {
    attempts?: number | null;
  };
  data: DeliveryJobData;
};

vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation((_queueName: string, processor: (job: BullJobLike) => Promise<void>) => {
    const instance = {
      processor,
      close: vi.fn().mockResolvedValue(undefined),
      on: vi.fn()
    };

    runtimeMocks.workerInstances.push(instance);
    return instance;
  })
}));

vi.mock('../src/logging/worker-logger.js', () => ({
  createConsoleWorkerLogger: vi.fn(() => runtimeMocks.logger)
}));

vi.mock('../src/queue/redis-connection.js', () => ({
  createRedisConnection: vi.fn(() => ({ host: '127.0.0.1', port: 6379 }))
}));

vi.mock('../src/db/client.js', () => ({
  getDbPool: runtimeMocks.getDbPool,
  closeDbPool: runtimeMocks.closeDbPool
}));

vi.mock('../src/db/event-repository.js', () => ({
  PostgresEventRepository: vi.fn().mockImplementation(() => {
    const instance = {
      getByEventId: vi.fn()
    };

    runtimeMocks.repositoryInstances.push(instance);
    return instance;
  })
}));

vi.mock('../src/state/delivery-state-writer.js', () => ({
  NoopDeliveryStateWriter: class {
    async write(): Promise<void> {
      return;
    }
  },
  PostgresDeliveryStateWriter: vi.fn().mockImplementation(() => ({
    write: runtimeMocks.write
  }))
}));

vi.mock('../src/adapters/noop-destination-adapter.js', () => ({
  NoopDestinationAdapter: class {
    public readonly destination: string;

    constructor(destination: string) {
      this.destination = destination;
    }

    async deliver(...args: Parameters<typeof runtimeMocks.adapterDeliver>): Promise<void> {
      await runtimeMocks.adapterDeliver(...args);
    }
  }
}));

import { createRouterWorker } from '../src/runtime/router-worker-runtime.js';

function buildConfig(meta: Partial<RouterWorkerConfig['meta']> = {}): RouterWorkerConfig {
  return {
    databaseUrl: 'postgres://example',
    redis: {} as never,
    queueName: 'router-deliveries',
    workerName: 'router-worker-test',
    concurrency: 1,
    meta,
    google: {},
    tiktok: {}
  };
}

function buildJob(overrides: Partial<BullJobLike> = {}): BullJobLike {
  const defaults: BullJobLike = {
    id: 'job-001',
    queueName: 'router-deliveries',
    attemptsMade: 0,
    opts: {
      attempts: 3
    },
    data: {
      eventId: 'evt-001',
      destination: 'meta',
      requestedAt: '2026-04-13T10:00:00.000Z'
    }
  };

  return {
    ...defaults,
    ...overrides,
    opts: {
      ...defaults.opts,
      ...overrides.opts
    },
    data: {
      ...defaults.data,
      ...overrides.data
    }
  };
}

function buildEvent(): CanonicalEventRecord {
  return {
    eventId: 'evt-001',
    eventName: 'purchase',
    eventTimestamp: new Date('2026-04-13T10:00:00.000Z'),
    emailHash: 'hash-123',
    ingestIp: '203.0.113.10',
    userAgent: 'Mozilla/5.0',
    gclid: 'gclid-123',
    ttclid: 'ttclid-123',
    eventValue: 42.5,
    currency: 'USD',
    payload: {
      order_id: 'ord-001'
    }
  };
}

describe('createRouterWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', runtimeMocks.fetch);
    runtimeMocks.fetch.mockReset();
    runtimeMocks.workerInstances.length = 0;
    runtimeMocks.repositoryInstances.length = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to noop meta delivery when config is incomplete', async () => {
    const runtime = createRouterWorker(buildConfig({}));

    runtimeMocks.repositoryInstances[0].getByEventId.mockResolvedValueOnce(null);

    await expect(runtimeMocks.workerInstances[0].processor(buildJob())).rejects.toBeInstanceOf(TerminalDeliveryError);

    expect(runtimeMocks.logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: 'meta',
        missingConfig: expect.arrayContaining(['meta.endpointUrl', 'meta.pixelId', 'meta.accessToken'])
      }),
      'meta config missing; using noop adapter'
    );
    expect(runtimeMocks.repositoryInstances[0].getByEventId).toHaveBeenCalledWith('evt-001');
    expect(runtimeMocks.adapterDeliver).not.toHaveBeenCalled();
    expect(runtimeMocks.write).not.toHaveBeenCalled();

    await runtime.close();
  });

  it('fetches the event, calls the noop adapter fallback, and marks the delivery as delivered', async () => {
    const event = buildEvent();
    const runtime = createRouterWorker(buildConfig({}));

    runtimeMocks.repositoryInstances[0].getByEventId.mockResolvedValueOnce(event);

    await expect(runtimeMocks.workerInstances[0].processor(buildJob())).resolves.toBeUndefined();

    expect(runtimeMocks.repositoryInstances[0].getByEventId).toHaveBeenCalledWith('evt-001');
    expect(runtimeMocks.adapterDeliver).toHaveBeenCalledTimes(1);
    expect(runtimeMocks.adapterDeliver.mock.calls[0]?.[0]).toMatchObject({
      data: {
        eventId: 'evt-001',
        destination: 'meta'
      },
      event
    });
    expect(runtimeMocks.write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'evt-001',
        destination: 'meta',
        status: 'delivered',
        deliveredAt: expect.any(Date)
      })
    );

    await runtime.close();
  });

  it('uses the Meta conversions adapter when config is complete', async () => {
    const event = buildEvent();
    runtimeMocks.fetch.mockResolvedValueOnce(new Response('{"success":true}', { status: 200, statusText: 'OK' }));
    const runtime = createRouterWorker(
      buildConfig({
        endpointUrl: 'https://graph.facebook.com/v20.0',
        pixelId: '1234567890',
        accessToken: 'meta-access-token',
        testEventCode: 'TEST123'
      })
    );

    runtimeMocks.repositoryInstances[0].getByEventId.mockResolvedValueOnce(event);

    await expect(runtimeMocks.workerInstances[0].processor(buildJob())).resolves.toBeUndefined();

    expect(runtimeMocks.adapterDeliver).not.toHaveBeenCalled();
    expect(runtimeMocks.fetch).toHaveBeenCalledTimes(1);

    const [requestUrl, requestInit] = runtimeMocks.fetch.mock.calls[0] ?? [];
    expect(requestUrl).toBe('https://graph.facebook.com/v20.0/1234567890/events?access_token=meta-access-token');
    expect(requestInit).toMatchObject({
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      }
    });

    const body = JSON.parse(String(requestInit?.body));
    expect(body).toEqual({
      data: [
        {
          event_name: 'Purchase',
          event_time: 1776074400,
          event_id: 'evt-001',
          action_source: 'website',
          user_data: {
            em: ['hash-123'],
            client_ip_address: '203.0.113.10',
            client_user_agent: 'Mozilla/5.0'
          },
          custom_data: {
            value: 42.5,
            currency: 'USD'
          }
        }
      ],
      test_event_code: 'TEST123'
    });

    expect(runtimeMocks.write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'evt-001',
        destination: 'meta',
        status: 'delivered',
        deliveredAt: expect.any(Date)
      })
    );

    await runtime.close();
  });
});
