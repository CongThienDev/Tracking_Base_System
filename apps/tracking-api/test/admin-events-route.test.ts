import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { createEventDetail, createEventListItem, InMemoryEventReadRepository, RecordingDeliveryJobDispatcher } from './support/fakes.js';

describe('GET /admin/events', () => {
  it('returns recent events with paging metadata', async () => {
    const app = buildApp({
      eventReadRepository: new InMemoryEventReadRepository({
        listResult: {
          total: 1,
          items: [
            createEventListItem({
              deliveries: [
                {
                  destination: 'meta',
                  status: 'delivered',
                  attemptCount: 1,
                  updatedAt: '2026-04-14T00:01:00.000Z',
                  lastErrorMessage: null
                }
              ],
              deliveryOverallStatus: 'success'
            })
          ]
        }
      }),
      deliveryJobDispatcher: new RecordingDeliveryJobDispatcher()
    });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/events?limit=10&offset=0'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      paging: {
        limit: 10,
        offset: 0,
        total: 1
      }
    });

    const body = response.json() as {
      items: Array<{
        eventId: string;
        deliveryOverallStatus: string;
      }>;
    };
    expect(body.items[0]?.eventId).toBe('evt-001');
    expect(body.items[0]?.deliveryOverallStatus).toBe('success');

    await app.close();
  });

  it('clamps invalid paging query params', async () => {
    const app = buildApp({
      eventReadRepository: new InMemoryEventReadRepository(),
      deliveryJobDispatcher: new RecordingDeliveryJobDispatcher()
    });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/events?limit=999&offset=-4'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      paging: {
        limit: 100,
        offset: 0,
        total: 0
      }
    });

    await app.close();
  });

  it('parses and forwards filter query params', async () => {
    const repository = new InMemoryEventReadRepository();
    const app = buildApp({
      eventReadRepository: repository,
      deliveryJobDispatcher: new RecordingDeliveryJobDispatcher()
    });

    const response = await app.inject({
      method: 'GET',
      url:
        '/admin/events?limit=15&offset=5&event_name=purchase&source=meta&delivery_status=failed&from=2026-04-13T00:00:00.000Z&to=2026-04-14T00:00:00.000Z&destination=tiktok&event_id=evt-123&event_id_like=evt-&sort_by=event_timestamp&sort_order=asc'
    });

    expect(response.statusCode).toBe(200);
    expect(repository.lastListInput).toEqual({
      limit: 15,
      offset: 5,
      eventName: 'purchase',
      source: 'meta',
      deliveryOverallStatus: 'failed',
      from: '2026-04-13T00:00:00.000Z',
      to: '2026-04-14T00:00:00.000Z',
      destination: 'tiktok',
      eventId: 'evt-123',
      eventIdLike: 'evt-',
      sortBy: 'event_timestamp',
      sortOrder: 'asc'
    });

    await app.close();
  });
});

describe('GET /admin/events/:event_id', () => {
  it('returns the full event payload and delivery rows', async () => {
    const repository = new InMemoryEventReadRepository({
      eventById: createEventDetail()
    });
    const app = buildApp({
      eventReadRepository: repository,
      deliveryJobDispatcher: new RecordingDeliveryJobDispatcher()
    });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/events/evt-001'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      event: {
        eventId: 'evt-001',
        payload: {
          value: 49.99,
          currency: 'USD'
        },
        deliveries: [
          {
            destination: 'meta',
            status: 'failed',
            attemptCount: 2,
            lastErrorCode: 'timeout'
          }
        ]
      }
    });
    expect(repository.lastGetEventId).toBe('evt-001');

    await app.close();
  });

  it('returns not found for an unknown event', async () => {
    const app = buildApp({
      eventReadRepository: new InMemoryEventReadRepository({ eventById: null }),
      deliveryJobDispatcher: new RecordingDeliveryJobDispatcher()
    });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/events/evt-missing'
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      status: 'error',
      code: 'not_found'
    });

    await app.close();
  });
});

describe('POST /admin/events/:event_id/replay', () => {
  it('replays failed destinations by default', async () => {
    const repository = new InMemoryEventReadRepository({
      eventById: createEventDetail(),
      replayResult: {
        eventId: 'evt-001',
        destinations: ['meta']
      }
    });
    const dispatcher = new RecordingDeliveryJobDispatcher();
    const app = buildApp({
      eventReadRepository: repository,
      deliveryJobDispatcher: dispatcher
    });

    const response = await app.inject({
      method: 'POST',
      url: '/admin/events/evt-001/replay'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      replayedDestinations: ['meta']
    });
    expect(repository.lastReplayInput).toEqual({
      eventId: 'evt-001',
      destinations: undefined
    });
    expect(dispatcher.replayCount()).toBe(1);
    expect(dispatcher.lastReplayRequest()).toMatchObject({
      eventId: 'evt-001',
      destinations: ['meta'],
      replayTag: expect.any(String)
    });

    await app.close();
  });

  it('replays explicitly selected destinations', async () => {
    const repository = new InMemoryEventReadRepository({
      eventById: createEventDetail(),
      replayResult: {
        eventId: 'evt-001',
        destinations: ['meta', 'google']
      }
    });
    const dispatcher = new RecordingDeliveryJobDispatcher();
    const app = buildApp({
      eventReadRepository: repository,
      deliveryJobDispatcher: dispatcher
    });

    const response = await app.inject({
      method: 'POST',
      url: '/admin/events/evt-001/replay',
      payload: {
        destinations: ['meta', 'google']
      }
    });

    expect(response.statusCode).toBe(200);
    expect(repository.lastReplayInput).toEqual({
      eventId: 'evt-001',
      destinations: ['meta', 'google']
    });
    expect(dispatcher.lastReplayRequest()).toMatchObject({
      eventId: 'evt-001',
      destinations: ['meta', 'google']
    });

    await app.close();
  });

  it('rejects unsupported replay destinations', async () => {
    const app = buildApp({
      eventReadRepository: new InMemoryEventReadRepository({
        eventById: createEventDetail()
      }),
      deliveryJobDispatcher: new RecordingDeliveryJobDispatcher()
    });

    const response = await app.inject({
      method: 'POST',
      url: '/admin/events/evt-001/replay',
      payload: {
        destinations: ['meta', 'unknown-destination']
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      status: 'error',
      code: 'validation_error'
    });

    await app.close();
  });
});
