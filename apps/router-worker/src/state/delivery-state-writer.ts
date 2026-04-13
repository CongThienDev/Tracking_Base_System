import type { Pool } from 'pg';

export type DeliveryStateStatus = 'retrying' | 'failed' | 'delivered';

export type DeliveryStateUpdate = {
  eventId: string;
  destination: string;
  attemptCount: number;
  status: DeliveryStateStatus;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  lastResponseSummary?: Record<string, unknown> | null;
  nextAttemptAt?: Date | null;
  deliveredAt?: Date | null;
};

export interface DeliveryStateWriter {
  write(update: DeliveryStateUpdate): Promise<void>;
}

export class NoopDeliveryStateWriter implements DeliveryStateWriter {
  async write(): Promise<void> {
    return;
  }
}

export class PostgresDeliveryStateWriter implements DeliveryStateWriter {
  constructor(private readonly pool: Pick<Pool, 'query'>) {}

  async write(update: DeliveryStateUpdate): Promise<void> {
    await this.pool.query(
      `insert into event_deliveries (
        event_id,
        destination,
        attempt_count,
        status,
        last_error_code,
        last_error_message,
        last_response_summary,
        next_attempt_at,
        delivered_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9
      ) on conflict (event_id, destination)
      do update set
        attempt_count = excluded.attempt_count,
        status = excluded.status,
        last_error_code = excluded.last_error_code,
        last_error_message = excluded.last_error_message,
        last_response_summary = excluded.last_response_summary,
        next_attempt_at = excluded.next_attempt_at,
        delivered_at = case
          when excluded.delivered_at is not null then excluded.delivered_at
          else event_deliveries.delivered_at
        end,
        updated_at = now()`,
      [
        update.eventId,
        update.destination,
        update.attemptCount,
        update.status,
        update.lastErrorCode ?? null,
        update.lastErrorMessage ?? null,
        update.lastResponseSummary ? JSON.stringify(update.lastResponseSummary) : null,
        update.nextAttemptAt ?? null,
        update.deliveredAt ?? null
      ]
    );
  }
}
