import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { buildApp } from '../src/app.js';
import { PostgresEventRepository } from '../src/repositories/postgres-event-repository.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = testDatabaseUrl ? describe : describe.skip;

describePostgres('POST /track with Postgres', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDatabaseUrl });

    const migrationPath = resolve(process.cwd(), '../../infra/sql/001_phase1_ingestion.sql');
    const migrationSql = readFileSync(migrationPath, 'utf8');

    await pool.query(migrationSql);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('delete from events');
  });

  it('deduplicates duplicate event_id at database level', async () => {
    const eventRepository = new PostgresEventRepository(pool);
    const app = buildApp({ eventRepository });

    const payload = {
      event_id: 'evt-db-001',
      event_name: 'purchase',
      session: {
        session_id: 'sess-db-001'
      },
      event_data: {
        value: 10,
        currency: 'USD'
      }
    };

    const first = await app.inject({
      method: 'POST',
      url: '/track',
      headers: { 'content-type': 'application/json' },
      payload
    });

    const second = await app.inject({
      method: 'POST',
      url: '/track',
      headers: { 'content-type': 'application/json' },
      payload
    });

    const rowCountResult = await pool.query('select count(*)::int as count from events where event_id = $1', [
      'evt-db-001'
    ]);

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ deduplicated: false, event_id: 'evt-db-001' });
    expect(second.json()).toMatchObject({ deduplicated: true, event_id: 'evt-db-001' });
    expect(rowCountResult.rows[0].count).toBe(1);

    await app.close();
  });
});
