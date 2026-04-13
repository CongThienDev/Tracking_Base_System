import type { Pool } from 'pg';
import type { CanonicalEventRecord } from '../types.js';

export interface EventRepository {
  getByEventId(eventId: string): Promise<CanonicalEventRecord | null>;
}

type EventRow = {
  event_id: string;
  event_name: string;
  event_timestamp: Date | string;
  email_hash: string | null;
  ingest_ip: string | null;
  user_agent: string | null;
  gclid: string | null;
  ttclid: string | null;
  event_value: number | string | null;
  currency: string | null;
  payload: unknown;
};

function toNumber(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPayload(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  return {};
}

export class PostgresEventRepository implements EventRepository {
  constructor(private readonly pool: Pick<Pool, 'query'>) {}

  async getByEventId(eventId: string): Promise<CanonicalEventRecord | null> {
    const result = await this.pool.query<EventRow>(
      `select
        event_id,
        event_name,
        event_timestamp,
        email_hash,
        ingest_ip,
        user_agent,
        gclid,
        ttclid,
        event_value,
        currency,
        payload
      from events
      where event_id = $1
      limit 1`,
      [eventId]
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return {
      eventId: row.event_id,
      eventName: row.event_name,
      eventTimestamp: row.event_timestamp instanceof Date ? row.event_timestamp : new Date(row.event_timestamp),
      emailHash: row.email_hash,
      ingestIp: row.ingest_ip,
      userAgent: row.user_agent,
      gclid: row.gclid,
      ttclid: row.ttclid,
      eventValue: toNumber(row.event_value),
      currency: row.currency,
      payload: toPayload(row.payload)
    };
  }
}
