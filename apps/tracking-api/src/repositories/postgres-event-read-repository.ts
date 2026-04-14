import type { Pool } from 'pg';
import type {
  DeliveryRow,
  DeliveryRowDetail,
  EventDetail,
  EventListItem,
  ListEventsInput,
  ListEventsResult,
  ReplayEventDeliveriesResult
} from '../types/admin-events.js';

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

type EventDetailRow = {
  event_id: string;
  event_name: string;
  event_timestamp: string;
  user_id: string | null;
  email_hash: string | null;
  anonymous_id: string | null;
  session_id: string;
  source: string | null;
  campaign: string | null;
  ad_id: string | null;
  gclid: string | null;
  ttclid: string | null;
  customer_type: string | null;
  event_value: string | number | null;
  currency: string | null;
  payload: Record<string, unknown> | string | null;
  ingest_ip: string | null;
  user_agent: string | null;
  route_status: string;
  created_at: string;
  updated_at: string;
};

type EventDeliveryDetailRow = {
  destination: string;
  status: DeliveryRow['status'];
  attempt_count: number;
  updated_at: string;
  last_error_code: string | null;
  last_error_message: string | null;
  last_response_summary: Record<string, unknown> | string | null;
  next_attempt_at: string | null;
  delivered_at: string | null;
  created_at: string;
};

type ReplayDeliveryRow = {
  destination: string;
  updated_at: string;
};

type QueryFilterState = {
  clauses: string[];
  values: unknown[];
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

function mapDeliveries(source: EventListRow['deliveries']): DeliveryRow[] {
  return source.map((item) => ({
    destination: item.destination,
    status: item.status,
    attemptCount: item.attempt_count,
    updatedAt: item.updated_at,
    lastErrorMessage: item.last_error_message
  }));
}

function normalizeJsonObject(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  return typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function normalizePayload(value: unknown): Record<string, unknown> {
  return normalizeJsonObject(value) ?? {};
}

function buildWhereFilters(input: ListEventsInput): QueryFilterState {
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (input.eventName && input.eventName.trim().length > 0) {
    values.push(`%${input.eventName.trim()}%`);
    clauses.push(`e.event_name ilike $${values.length}`);
  }

  if (input.source && input.source.trim().length > 0) {
    values.push(input.source.trim());
    clauses.push(`coalesce(e.source, '') ilike $${values.length}`);
  }

  if (input.from && input.from.trim().length > 0) {
    values.push(input.from.trim());
    clauses.push(`e.created_at >= $${values.length}`);
  }

  if (input.to && input.to.trim().length > 0) {
    values.push(input.to.trim());
    clauses.push(`e.created_at <= $${values.length}`);
  }

  if (input.destination && input.destination.trim().length > 0) {
    values.push(input.destination.trim());
    clauses.push(
      `exists (
        select 1
        from event_deliveries d_destination
        where d_destination.event_id = e.event_id
          and d_destination.destination = $${values.length}
      )`
    );
  }

  if (input.eventId && input.eventId.trim().length > 0) {
    values.push(input.eventId.trim());
    clauses.push(`e.event_id = $${values.length}`);
  }

  if (input.eventIdLike && input.eventIdLike.trim().length > 0) {
    values.push(`%${input.eventIdLike.trim()}%`);
    clauses.push(`e.event_id ilike $${values.length}`);
  }

  if (input.deliveryOverallStatus === 'failed') {
    clauses.push(
      `exists (
        select 1
        from event_deliveries d_status
        where d_status.event_id = e.event_id
          and d_status.status = 'failed'
      )`
    );
  }

  if (input.deliveryOverallStatus === 'success') {
    clauses.push(
      `exists (
        select 1
        from event_deliveries d_status
        where d_status.event_id = e.event_id
      )`
    );
    clauses.push(
      `not exists (
        select 1
        from event_deliveries d_status
        where d_status.event_id = e.event_id
          and d_status.status <> 'delivered'
      )`
    );
  }

  if (input.deliveryOverallStatus === 'queued') {
    clauses.push(
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

  return { clauses, values };
}

function buildWhereSql(input: ListEventsInput): { whereSql: string; values: unknown[] } {
  const { clauses, values } = buildWhereFilters(input);

  return {
    whereSql: clauses.length > 0 ? `where ${clauses.join(' and ')}` : '',
    values
  };
}

function buildOrderBySql(input: ListEventsInput): string {
  const sortOrder = input.sortOrder === 'asc' ? 'asc' : 'desc';

  switch (input.sortBy ?? 'created_at') {
    case 'event_timestamp':
      return `order by e.event_timestamp ${sortOrder}, e.created_at desc, e.event_id desc`;
    case 'event_name':
      return `order by e.event_name ${sortOrder}, e.created_at desc, e.event_id desc`;
    case 'created_at':
    default:
      return `order by e.created_at ${sortOrder}, e.event_id desc`;
  }
}

function mapDetailDeliveries(source: Array<{
  destination: string;
  status: DeliveryRow['status'];
  attempt_count: number;
  updated_at: string;
  last_error_code: string | null;
  last_error_message: string | null;
  last_response_summary: Record<string, unknown> | string | null;
  next_attempt_at: string | null;
  delivered_at: string | null;
  created_at: string;
}>): DeliveryRowDetail[] {
  return source.map((item) => ({
    destination: item.destination,
    status: item.status,
    attemptCount: item.attempt_count,
    updatedAt: item.updated_at,
    lastErrorCode: item.last_error_code,
    lastErrorMessage: item.last_error_message,
    lastResponseSummary: normalizeJsonObject(item.last_response_summary),
    nextAttemptAt: item.next_attempt_at,
    deliveredAt: item.delivered_at,
    createdAt: item.created_at
  }));
}

export class PostgresEventReadRepository {
  constructor(private readonly pool: Pick<Pool, 'query'>) {}

  async listRecentEvents(input: ListEventsInput): Promise<ListEventsResult> {
    const { whereSql, values } = buildWhereSql(input);
    const orderBySql = buildOrderBySql(input);
    const limitPlaceholder = `$${values.length + 1}`;
    const offsetPlaceholder = `$${values.length + 2}`;
    const listValues = [...values, input.limit, input.offset];

    const [countResult, rowsResult] = await Promise.all([
      this.pool.query<{ total: string }>(
        `select count(*)::text as total
        from events e
        ${whereSql}`,
        values
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
        ${orderBySql}
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

  async getEventById(eventId: string): Promise<EventDetail | null> {
    const eventResult = await this.pool.query<EventDetailRow>(
      `select
        e.event_id,
        e.event_name,
        e.event_timestamp,
        e.user_id,
        e.email_hash,
        e.anonymous_id,
        e.session_id,
        e.source,
        e.campaign,
        e.ad_id,
        e.gclid,
        e.ttclid,
        e.customer_type,
        e.event_value,
        e.currency,
        e.payload,
        e.ingest_ip,
        e.user_agent,
        e.route_status,
        e.created_at,
        e.updated_at
      from events e
      where e.event_id = $1`,
      [eventId]
    );

    const event = eventResult.rows[0];
    if (!event) {
      return null;
    }

    const deliveriesResult = await this.pool.query<EventDeliveryDetailRow>(
      `select
        d.destination,
        d.status,
        d.attempt_count,
        d.updated_at,
        d.last_error_code,
        d.last_error_message,
        d.last_response_summary,
        d.next_attempt_at,
        d.delivered_at,
        d.created_at
      from event_deliveries d
      where d.event_id = $1
      order by d.destination`,
      [eventId]
    );

    const deliveries = mapDetailDeliveries(deliveriesResult.rows);

    return {
      eventId: event.event_id,
      eventName: event.event_name,
      eventTimestamp: event.event_timestamp,
      sessionId: event.session_id,
      source: event.source,
      campaign: event.campaign,
      routeStatus: event.route_status,
      eventValue: normalizeEventValue(event.event_value),
      currency: event.currency,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
      userId: event.user_id,
      emailHash: event.email_hash,
      anonymousId: event.anonymous_id,
      adId: event.ad_id,
      gclid: event.gclid,
      ttclid: event.ttclid,
      customerType: event.customer_type,
      payload: normalizePayload(event.payload),
      ingestIp: event.ingest_ip,
      userAgent: event.user_agent,
      deliveries,
      deliveryOverallStatus: deriveOverallStatus(deliveries)
    };
  }

  async replayEventDeliveries(input: {
    eventId: string;
    destinations?: string[];
  }): Promise<ReplayEventDeliveriesResult> {
    const trimmedDestinations = (input.destinations ?? [])
      .map((destination) => destination.trim())
      .filter((destination) => destination.length > 0);

    const query =
      trimmedDestinations.length > 0
        ? {
            sql: `update event_deliveries
              set status = 'retrying',
                  next_attempt_at = null,
                  delivered_at = null,
                  updated_at = now()
              where event_id = $1
                and destination = any($2::text[])
                and status <> 'retrying'
              returning destination, updated_at`,
            values: [input.eventId, trimmedDestinations]
          }
        : {
            sql: `update event_deliveries
              set status = 'retrying',
                  next_attempt_at = null,
                  delivered_at = null,
                  updated_at = now()
              where event_id = $1
                and status = 'failed'
              returning destination, updated_at`,
            values: [input.eventId]
          };

    const result = await this.pool.query<ReplayDeliveryRow>(query.sql, query.values);

    return {
      eventId: input.eventId,
      destinations: result.rows.map((row) => row.destination)
    };
  }
}
