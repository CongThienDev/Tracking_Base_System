import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run migrations');
}

const migrationsDir = resolve(process.cwd(), '../../infra/sql');
const migrationFiles = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort((a, b) => a.localeCompare(b));

if (migrationFiles.length === 0) {
  // eslint-disable-next-line no-console
  console.log('No migration files found');
  process.exit(0);
}

const pool = new Pool({ connectionString });

async function run(): Promise<void> {
  const client = await pool.connect();

  try {
    for (const migrationFile of migrationFiles) {
      const filePath = join(migrationsDir, migrationFile);
      const sql = readFileSync(filePath, 'utf8');

      // eslint-disable-next-line no-console
      console.log(`Running migration: ${migrationFile}`);

      await client.query('begin');
      await client.query(sql);
      await client.query('commit');
    }

    // eslint-disable-next-line no-console
    console.log('Migrations completed successfully');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
