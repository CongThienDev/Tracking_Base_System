import { Pool } from 'pg';

let pool: Pool | null = null;

export function getDbPool(connectionString: string): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString
    });
  }

  return pool;
}

export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
