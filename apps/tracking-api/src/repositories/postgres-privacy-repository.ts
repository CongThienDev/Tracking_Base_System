import type { Pool } from 'pg';

export type DeleteByUserSummary = {
  eventDeliveriesDeleted: number;
  eventsDeleted: number;
  usersDeleted: number;
};

type QueryExecutor = Pick<Pool, 'query'>;

type DeleteByUserRow = {
  event_deliveries_deleted: number | string;
  events_deleted: number | string;
  users_deleted: number | string;
};

export class PostgresPrivacyRepository {
  constructor(private readonly pool: QueryExecutor) {}

  async deleteByUserId(userId: string): Promise<DeleteByUserSummary> {
    const result = await this.pool.query<DeleteByUserRow>(
      `with user_events as (
        select event_id
        from events
        where user_id = $1
      ),
      deleted_event_deliveries as (
        delete from event_deliveries
        where event_id in (select event_id from user_events)
        returning 1
      ),
      deleted_events as (
        delete from events
        where user_id = $1
        returning 1
      ),
      deleted_users as (
        delete from users
        where user_id = $1
        returning 1
      )
      select
        (select count(*)::int from deleted_event_deliveries) as event_deliveries_deleted,
        (select count(*)::int from deleted_events) as events_deleted,
        (select count(*)::int from deleted_users) as users_deleted`,
      [userId]
    );

    const row = result.rows[0];

    return {
      eventDeliveriesDeleted: Number(row?.event_deliveries_deleted ?? 0),
      eventsDeleted: Number(row?.events_deleted ?? 0),
      usersDeleted: Number(row?.users_deleted ?? 0)
    };
  }
}
