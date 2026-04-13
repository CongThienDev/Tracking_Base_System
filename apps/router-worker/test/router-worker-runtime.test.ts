import { vi } from 'vitest';
import { describe, expect, it, beforeEach } from 'vitest';
import { TerminalDeliveryError } from '../src/processor/delivery-errors.js';
import type { CanonicalEventRecord, DeliveryJobData } from '../src/types.js';

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

  return {
    workerInstances,
    repositoryInstances,
    adapterDeliver,
    write,
    logger,
    getDbPool,
    closeDbPool
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
    runtimeMocks.workerInstances.length = 0;
    runtimeMocks.repositoryInstances.length = 0;
  });

  it('fails terminal when the canonical event is missing', async () => {
    const runtime = createRouterWorker({
      databaseUrl: 'postgres://example',
      redis: {} as never,
      queueName: 'router-deliveries',
      workerName: 'router-worker-test',
      concurrency: 1,
      google: {},
      tiktok: {}
    });

    runtimeMocks.repositoryInstances[0].getByEventId.mockResolvedValueOnce(null);

    await expect(runtimeMocks.workerInstances[0].processor(buildJob())).rejects.toBeInstanceOf(TerminalDeliveryError);

    expect(runtimeMocks.repositoryInstances[0].getByEventId).toHaveBeenCalledWith('evt-001');
    expect(runtimeMocks.adapterDeliver).not.toHaveBeenCalled();
    expect(runtimeMocks.write).not.toHaveBeenCalled();

    await runtime.close();
  });

  it('fetches the event, calls the adapter, and marks the delivery as delivered', async () => {
    const event = buildEvent();
    const runtime = createRouterWorker({
      databaseUrl: 'postgres://example',
      redis: {} as never,
      queueName: 'router-deliveries',
      workerName: 'router-worker-test',
      concurrency: 1,
      google: {},
      tiktok: {}
    });

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
});
