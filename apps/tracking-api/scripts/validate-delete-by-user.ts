import dotenv from 'dotenv';
import { Pool, type PoolClient } from 'pg';
import { PostgresPrivacyRepository } from '../src/repositories/postgres-privacy-repository.js';

dotenv.config();

const connectionString = process.env.TEST_DATABASE_URL;

if (!connectionString) {
  throw new Error('TEST_DATABASE_URL is required to validate delete-by-user');
}

const pool = new Pool({ connectionString });

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label} mismatch: expected ${expected}, received ${actual}`);
  }
}

async function seedValidationData(client: PoolClient): Promise<void> {
  await client.query('delete from event_deliveries');
  await client.query('delete from events');
  await client.query('delete from users');

  await client.query(
    `insert into users (user_id, first_seen, last_seen, email_hash, total_value, purchase_count)
     values
      ($1, $2, $3, $4, $5, $6),
      ($7, $8, $9, $10, $11, $12)`,
    [
      'user-target',
      '2026-04-13T00:00:00.000Z',
      '2026-04-13T00:10:00.000Z',
      'target-email-hash',
      100,
      2,
      'user-control',
      '2026-04-13T01:00:00.000Z',
      '2026-04-13T01:10:00.000Z',
      'control-email-hash',
      50,
      1
    ]
  );

  await client.query(
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
      customer_type,
      event_value,
      currency,
      payload,
      ingest_ip,
      user_agent
    ) values
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17::inet, $18),
      ($19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34::jsonb, $35::inet, $36),
      ($37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52::jsonb, $53::inet, $54)`,
    [
      'evt-target-1',
      'purchase',
      '2026-04-13T00:01:00.000Z',
      'user-target',
      'target-email-hash',
      null,
      'sess-target-1',
      'web',
      'spring',
      null,
      null,
      null,
      null,
      25,
      'USD',
      JSON.stringify({ plan: 'gold' }),
      null,
      'validator/1.0',
      'evt-target-2',
      'purchase',
      '2026-04-13T00:02:00.000Z',
      'user-target',
      'target-email-hash',
      null,
      'sess-target-2',
      'web',
      'spring',
      null,
      null,
      null,
      null,
      75,
      'USD',
      JSON.stringify({ plan: 'platinum' }),
      null,
      'validator/1.0',
      'evt-control-1',
      'purchase',
      '2026-04-13T01:01:00.000Z',
      'user-control',
      'control-email-hash',
      null,
      'sess-control-1',
      'web',
      'summer',
      null,
      null,
      null,
      null,
      50,
      'USD',
      JSON.stringify({ plan: 'silver' }),
      null,
      'validator/1.0'
    ]
  );

  await client.query(
    `insert into event_deliveries (event_id, destination, attempt_count, status, next_attempt_at)
     values
      ($1, $2, $3, $4, $5),
      ($6, $7, $8, $9, $10),
      ($11, $12, $13, $14, $15)`,
    [
      'evt-target-1',
      'meta',
      0,
      'pending',
      null,
      'evt-target-2',
      'google',
      0,
      'pending',
      null,
      'evt-control-1',
      'meta',
      0,
      'pending',
      null
    ]
  );
}

async function main(): Promise<void> {
  const client = await pool.connect();
  const repository = new PostgresPrivacyRepository(client);

  try {
    await client.query('begin');

    await seedValidationData(client);

    const deleted = await repository.deleteByUserId('user-target');

    assertEqual(deleted.eventDeliveriesDeleted, 2, 'event deliveries deleted');
    assertEqual(deleted.eventsDeleted, 2, 'events deleted');
    assertEqual(deleted.usersDeleted, 1, 'users deleted');

    const checks = [
      ['events', 'user-target', 0],
      ['event_deliveries', 'evt-target-1', 0],
      ['event_deliveries', 'evt-target-2', 0],
      ['users', 'user-target', 0],
      ['events', 'user-control', 1],
      ['event_deliveries', 'evt-control-1', 1],
      ['users', 'user-control', 1]
    ] as const;

    for (const [table, value, expected] of checks) {
      const column = table === 'users' ? 'user_id' : table === 'events' ? 'user_id' : 'event_id';
      const result = await client.query<{ count: number }>(
        `select count(*)::int as count from ${table} where ${column} = $1`,
        [value]
      );

      assertEqual(result.rows[0]?.count ?? -1, expected, `${table} remaining for ${value}`);
    }

    await client.query('rollback');
    // eslint-disable-next-line no-console
    console.log('delete-by-user validation passed');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
