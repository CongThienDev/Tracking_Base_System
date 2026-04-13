import { describe, expect, it, vi } from 'vitest';
import { PostgresPrivacyRepository } from '../src/repositories/postgres-privacy-repository.js';

describe('PostgresPrivacyRepository', () => {
  it('deletes event deliveries, events, and users for a user in order', async () => {
    const query = vi.fn(async () => ({
      rowCount: 1,
      rows: [
        {
          event_deliveries_deleted: 2,
          events_deleted: 2,
          users_deleted: 1
        }
      ]
    }));

    const repository = new PostgresPrivacyRepository({ query });

    await expect(repository.deleteByUserId('user-123')).resolves.toEqual({
      eventDeliveriesDeleted: 2,
      eventsDeleted: 2,
      usersDeleted: 1
    });

    expect(query).toHaveBeenCalledTimes(1);

    const [sql, params] = query.mock.calls[0];

    expect(sql).toContain('delete from event_deliveries');
    expect(sql).toContain('delete from events');
    expect(sql).toContain('delete from users');
    expect(sql.indexOf('delete from event_deliveries')).toBeLessThan(sql.indexOf('delete from events'));
    expect(sql.indexOf('delete from events')).toBeLessThan(sql.indexOf('delete from users'));
    expect(params).toEqual(['user-123']);
  });
});
