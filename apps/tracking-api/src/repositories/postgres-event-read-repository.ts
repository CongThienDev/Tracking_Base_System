import type { Pool } from 'pg';
import type { DeliveryRow, EventReadRepository, EventListItem, ListEventsResult } from '../types/admin-events.js';

type EventListRow = {
  event_id: string;
  event_name: string;
  event_timestamp: string;
  session_id: string;
  source: string | null;
  campaign: string | null;
  route_status: string;
  event_value: string | number | null;
  currency: string | null;
  created_at: string;
  deliveries: Array<{
    destination: string;
    status: DeliveryRow['status'];
    attempt_count: number;
    updated_at: string;
    last_error_message: string | null;
  }>;
};

function normalizeEventValue(value: string | number | null): number | null {
  if (value === null) {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function deriveOverallStatus(deliveries: DeliveryRow[]): EventListItem['deliveryOverallStatus'] {
  if (deliveries.length === 0) {
    return 'queued';
  }

  if (deliveries.some((delivery) => delivery.status === 'failed')) {
    return 'failed';
  }

  if (deliveries.every((delivery) => delivery.status === 'delivered')) {
    return 'success';
  }

  return 'queued';
}

function mapDeliveries(
  source: EventListRow['deliveries']
): DeliveryRow[] {
  return source.map((item) => ({
    destination: item.destination,
    status: item.status,
    attemptCount: item.attempt_count,
    updatedAt: item.updated_at,
    lastErrorMessage: item.last_error_message
  }));
}

export class PostgresEventReadRepository implements EventReadRepository {
  constructor(private readonly pool: Pick<Pool, 'query'>) {}

  async listRecentEvents(input: {
    limit: number;
    offset: number;
    eventName?: string;
    source?: string;
    deliveryOverallStatus?: 'queued' | 'success' | 'failed';
  }): Promise<ListEventsResult> {
    const whereClauses: string[] = [];
    const whereValues: Array<string> = [];

    if (input.eventName && input.eventName.trim().length > 0) {
      whereValues.push(`%${input.eventName.trim()}%`);
      whereClauses.push(`e.event_name ilike $${whereValues.length}`);
    }

    if (input.source && input.source.trim().length > 0) {
      whereValues.push(input.source.trim());
      whereClauses.push(`coalesce(e.source, '') ilike $${whereValues.length}`);
    }

    if (input.deliveryOverallStatus === 'failed') {
      whereClauses.push(
        `exists (
          select 1
          from event_deliveries d_status
          where d_status.event_id = e.event_id
            and d_status.status = 'failed'
        )`
      );
    }

    if (input.deliveryOverallStatus === 'success') {
      whereClauses.push(
        `exists (
          select 1
          from event_deliveries d_status
          where d_status.event_id = e.event_id
        )`
      );
      whereClauses.push(
        `not exists (
          select 1
          from event_deliveries d_status
          where d_status.event_id = e.event_id
            and d_status.status <> 'delivered'
        )`
      );
    }

    if (input.deliveryOverallStatus === 'queued') {
      whereClauses.push(
        `(
          not exists (
            select 1
            from event_deliveries d_status
            where d_status.event_id = e.event_id
          )
          or (
            not exists (
              select 1
              from event_deliveries d_status
              where d_status.event_id = e.event_id
                and d_status.status = 'failed'
            )
            and exists (
              select 1
              from event_deliveries d_status
              where d_status.event_id = e.event_id
                and d_status.status <> 'delivered'
            )
          )
        )`
      );
    }

    const whereSql = whereClauses.length > 0 ? `where ${whereClauses.join(' and ')}` : '';
    const limitPlaceholder = `$${whereValues.length + 1}`;
    const offsetPlaceholder = `$${whereValues.length + 2}`;
    const listValues = [...whereValues, input.limit, input.offset];

    const [countResult, rowsResult] = await Promise.all([
      this.pool.query<{ total: string }>(
        `select count(*)::text as total
        from events e
        ${whereSql}`,
        whereValues
      ),
      this.pool.query<EventListRow>(
        `select
          e.event_id,
          e.event_name,
          e.event_timestamp,
          e.session_id,
          e.source,
          e.campaign,
          e.route_status,
          e.event_value,
          e.currency,
          e.created_at,
          coalesce(
            json_agg(
              json_build_object(
                'destination', d.destination,
                'status', d.status,
                'attempt_count', d.attempt_count,
                'updated_at', d.updated_at,
                'last_error_message', d.last_error_message
              )
              order by d.destination
            ) filter (where d.event_id is not null),
            '[]'::json
          ) as deliveries
        from events e
        left join event_deliveries d on d.event_id = e.event_id
        ${whereSql}
        group by e.id
        order by e.created_at desc
        limit ${limitPlaceholder} offset ${offsetPlaceholder}`,
        listValues
      )
    ]);

    const items: EventListItem[] = rowsResult.rows.map((row) => {
      const deliveries = mapDeliveries(row.deliveries ?? []);

      return {
        eventId: row.event_id,
        eventName: row.event_name,
        eventTimestamp: row.event_timestamp,
        sessionId: row.session_id,
        source: row.source,
        campaign: row.campaign,
        routeStatus: row.route_status,
        eventValue: normalizeEventValue(row.event_value),
        currency: row.currency,
        createdAt: row.created_at,
        deliveries,
        deliveryOverallStatus: deriveOverallStatus(deliveries)
      };
    });

    return {
      total: Number(countResult.rows[0]?.total ?? 0),
      items
    };
  }
}
