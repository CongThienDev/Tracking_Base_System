import { describe, expect, it, vi } from 'vitest';
import {
  NoopDeliveryStateWriter,
  PostgresDeliveryStateWriter,
  type DeliveryStateUpdate
} from '../src/state/delivery-state-writer.js';

describe('delivery state writer', () => {
  it('noop writer resolves without side effects', async () => {
    const writer = new NoopDeliveryStateWriter();
    await expect(
      writer.write({
        eventId: 'evt-001',
        destination: 'meta',
        attemptCount: 1,
        status: 'delivered'
      })
    ).resolves.toBeUndefined();
  });

  it('postgres writer issues upsert query', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 1 });
    const writer = new PostgresDeliveryStateWriter({ query } as unknown as { query: typeof query });

    const update: DeliveryStateUpdate = {
      eventId: 'evt-001',
      destination: 'meta',
      attemptCount: 2,
      status: 'retrying',
      lastErrorCode: 'RetryableDeliveryError',
      lastErrorMessage: 'temporary outage',
      nextAttemptAt: new Date('2026-04-13T10:00:01.000Z')
    };

    await writer.write(update);

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];

    expect(sql).toContain('insert into event_deliveries');
    expect(sql).toContain('on conflict (event_id, destination)');
    expect(params[0]).toBe('evt-001');
    expect(params[1]).toBe('meta');
    expect(params[2]).toBe(2);
    expect(params[3]).toBe('retrying');
  });
});
