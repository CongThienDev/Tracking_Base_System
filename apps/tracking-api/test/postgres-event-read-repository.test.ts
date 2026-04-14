import { describe, expect, it, vi } from 'vitest';
import { PostgresEventReadRepository } from '../src/repositories/postgres-event-read-repository.js';

function createPool() {
  const query = vi.fn(async (sql: string) => {
    if (sql.startsWith('select count(*)::text as total')) {
      return { rows: [{ total: '1' }] };
    }

    if (sql.includes('left join event_deliveries d on d.event_id = e.event_id')) {
      return {
        rows: [
          {
            event_id: 'evt-001',
            event_name: 'purchase',
            event_timestamp: '2026-04-14T00:00:00.000Z',
            session_id: 'sess-001',
            source: 'meta',
            campaign: 'spring_sale',
            route_status: 'pending',
            event_value: '49.99',
            currency: 'USD',
            created_at: '2026-04-14T00:00:00.000Z',
            deliveries: [
              {
                destination: 'meta',
                status: 'failed',
                attempt_count: 2,
                updated_at: '2026-04-14T00:02:00.000Z',
                last_error_message: 'timeout'
              }
            ]
          }
        ]
      };
    }

    if (sql.includes('from events e')) {
      return {
        rows: [
          {
            event_id: 'evt-001',
            event_name: 'purchase',
            event_timestamp: '2026-04-14T00:00:00.000Z',
            user_id: 'user-001',
            email_hash: 'hash-001',
            anonymous_id: 'anon-001',
            session_id: 'sess-001',
            source: 'meta',
            campaign: 'spring_sale',
            ad_id: 'ad-001',
            gclid: 'gclid-001',
            ttclid: 'ttclid-001',
            customer_type: 'consumer',
            event_value: '49.99',
            currency: 'USD',
            payload: { value: 49.99 },
            ingest_ip: '203.0.113.10',
            user_agent: 'agent',
            route_status: 'pending',
            created_at: '2026-04-14T00:00:00.000Z',
            updated_at: '2026-04-14T00:01:00.000Z'
          }
        ]
      };
    }

    if (sql.includes('from event_deliveries d')) {
      return {
        rows: [
          {
            destination: 'meta',
            status: 'failed',
            attempt_count: 2,
            updated_at: '2026-04-14T00:02:00.000Z',
            last_error_code: 'timeout',
            last_error_message: 'timeout',
            last_response_summary: { worker: 'router-worker-1' },
            next_attempt_at: '2026-04-14T00:03:00.000Z',
            delivered_at: null,
            created_at: '2026-04-14T00:01:00.000Z'
          }
        ]
      };
    }

    if (sql.startsWith('update event_deliveries')) {
      return {
        rows: [
          {
            destination: 'meta',
            updated_at: '2026-04-14T00:04:00.000Z'
          }
        ]
      };
    }

    return { rows: [] };
  });

  return {
    query
  };
}

describe('PostgresEventReadRepository', () => {
  it('builds list filters and sort order from the admin query input', async () => {
    const pool = createPool();
    const repository = new PostgresEventReadRepository(pool);

    const result = await repository.listRecentEvents({
      limit: 10,
      offset: 5,
      eventName: 'purchase',
      source: 'meta',
      deliveryOverallStatus: 'failed',
      from: '2026-04-13T00:00:00.000Z',
      to: '2026-04-14T00:00:00.000Z',
      destination: 'tiktok',
      eventId: 'evt-001',
      eventIdLike: 'evt-',
      sortBy: 'event_timestamp',
      sortOrder: 'asc'
    });

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      eventId: 'evt-001',
      eventName: 'purchase',
      deliveryOverallStatus: 'failed'
    });

    const [countCall, listCall] = pool.query.mock.calls;
    expect(countCall?.[0]).toContain('e.created_at >= $3');
    expect(countCall?.[0]).toContain('e.created_at <= $4');
    expect(countCall?.[0]).toContain('exists (');
    expect(listCall?.[0]).toContain('order by e.event_timestamp asc');
    expect(listCall?.[0]).toContain('e.event_id = $6');
    expect(listCall?.[0]).toContain('e.event_id ilike $7');
    expect(listCall?.[0]).toContain("d_status.status = 'failed'");
  });

  it('returns the full event record and delivery rows for detail lookup', async () => {
    const pool = createPool();
    const repository = new PostgresEventReadRepository(pool);

    const event = await repository.getEventById('evt-001');

    expect(event).toMatchObject({
      eventId: 'evt-001',
      payload: {
        value: 49.99
      },
      deliveryOverallStatus: 'failed',
      deliveries: [
        {
          destination: 'meta',
          status: 'failed',
          lastErrorCode: 'timeout'
        }
      ]
    });
    expect(
      pool.query.mock.calls.some(
        ([sql]) => String(sql).includes('from events e') && String(sql).includes('where e.event_id = $1')
      )
    ).toBe(true);
  });

  it('replays failed deliveries by default and selected destinations when provided', async () => {
    const pool = createPool();
    const repository = new PostgresEventReadRepository(pool);

    const defaultResult = await repository.replayEventDeliveries({
      eventId: 'evt-001'
    });
    const selectedResult = await repository.replayEventDeliveries({
      eventId: 'evt-001',
      destinations: ['meta', 'google']
    });

    expect(defaultResult.destinations).toEqual(['meta']);
    expect(selectedResult.destinations).toEqual(['meta']);
    expect(pool.query.mock.calls.some(([sql]) => String(sql).includes("status = 'failed'"))).toBe(true);
    expect(pool.query.mock.calls.some(([sql]) => String(sql).includes('destination = any($2::text[])'))).toBe(true);
  });
});
