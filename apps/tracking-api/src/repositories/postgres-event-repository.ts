import type { Pool } from 'pg';
import type { EventRepository, InsertEventResult, NormalizedTrackEvent } from '../types/track.js';

export class PostgresEventRepository implements EventRepository {
  constructor(private readonly pool: Pool) {}

  async insertIfNotExists(event: NormalizedTrackEvent): Promise<InsertEventResult> {
    const result = await this.pool.query(
      `insert into events (
        event_id,
        event_name,
        event_timestamp,
        user_id,
        email_hash,
        anonymous_id,
        session_id,
        source,
        campaign,
        ad_id,
        gclid,
        ttclid,
        event_value,
        currency,
        payload,
        ingest_ip,
        user_agent
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16::inet, $17
      ) on conflict (event_id) do nothing
      returning event_id`,
      [
        event.eventId,
        event.eventName,
        event.eventTimestamp.toISOString(),
        event.userId,
        event.emailHash,
        event.anonymousId,
        event.sessionId,
        event.source,
        event.campaign,
        event.adId,
        event.gclid,
        event.ttclid,
        event.eventValue,
        event.currency,
        JSON.stringify(event.payload),
        event.ingestIp,
        event.userAgent
      ]
    );

    return {
      inserted: result.rowCount === 1
    };
  }
}
