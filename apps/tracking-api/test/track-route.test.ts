import { beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import type { EventRepository, InsertEventResult, NormalizedTrackEvent } from '../src/types/track.js';

class InMemoryEventRepository implements EventRepository {
  private readonly events = new Map<string, NormalizedTrackEvent>();

  async insertIfNotExists(event: NormalizedTrackEvent): Promise<InsertEventResult> {
    if (this.events.has(event.eventId)) {
      return { inserted: false };
    }

    this.events.set(event.eventId, event);
    return { inserted: true };
  }

  count(): number {
    return this.events.size;
  }
}

describe('POST /track', () => {
  let repository: InMemoryEventRepository;

  beforeEach(() => {
    repository = new InMemoryEventRepository();
  });

  it('stores a valid event and returns event_id', async () => {
    const app = buildApp({ eventRepository: repository });

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

    await app.close();
  });

  it('deduplicates duplicate event_id requests', async () => {
    const app = buildApp({ eventRepository: repository });

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

    await app.close();
  });

  it('returns validation error for missing session_id', async () => {
    const app = buildApp({ eventRepository: repository });

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

    await app.close();
  });
});
