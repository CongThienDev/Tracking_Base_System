import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { createEventListItem, InMemoryEventReadRepository } from './support/fakes.js';
import type { EventReadRepository, ListEventsResult } from '../src/types/admin-events.js';

class CapturingEventReadRepository implements EventReadRepository {
  public lastInput:
    | {
        limit: number;
        offset: number;
        eventName?: string;
        source?: string;
        deliveryOverallStatus?: 'queued' | 'success' | 'failed';
      }
    | null = null;

  async listRecentEvents(input: {
    limit: number;
    offset: number;
    eventName?: string;
    source?: string;
    deliveryOverallStatus?: 'queued' | 'success' | 'failed';
  }): Promise<ListEventsResult> {
    this.lastInput = input;
    return {
      total: 0,
      items: []
    };
  }
}

describe('GET /admin/events', () => {
  it('returns recent events with paging metadata', async () => {
    const app = buildApp({
      eventReadRepository: new InMemoryEventReadRepository({
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
      })
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
      eventReadRepository: new InMemoryEventReadRepository({ total: 0, items: [] })
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
    const repository = new CapturingEventReadRepository();
    const app = buildApp({
      eventReadRepository: repository
    });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/events?limit=15&offset=5&event_name=purchase&source=meta&delivery_status=failed'
    });

    expect(response.statusCode).toBe(200);
    expect(repository.lastInput).toEqual({
      limit: 15,
      offset: 5,
      eventName: 'purchase',
      source: 'meta',
      deliveryOverallStatus: 'failed'
    });

    await app.close();
  });
});
