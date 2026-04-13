import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_PORT = 3000;
const DEFAULT_REDIS_PORT = 6379;

export type AppConfig = {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  routerQueue: {
    queueName: string;
    redis: {
      url?: string;
      host?: string;
      port?: number;
      username?: string;
      password?: string;
      db?: number;
    };
  };
};

function parseOptionalPositiveInteger(value: string | undefined, fieldName: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return parsed;
}

function parseOptionalNonNegativeInteger(value: string | undefined, fieldName: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }

  return parsed;
}

export function getConfig(): AppConfig {
  const portValue = process.env.PORT ?? String(DEFAULT_PORT);
  const port = Number(portValue);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT value: ${portValue}`);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port,
    databaseUrl,
    routerQueue: {
      queueName: process.env.ROUTER_QUEUE_NAME?.trim() || 'router-deliveries',
      redis: {
        url: process.env.REDIS_URL?.trim() || undefined,
        host: process.env.REDIS_HOST?.trim() || undefined,
        port: parseOptionalPositiveInteger(process.env.REDIS_PORT, 'REDIS_PORT') ?? DEFAULT_REDIS_PORT,
        username: process.env.REDIS_USERNAME?.trim() || undefined,
        password: process.env.REDIS_PASSWORD?.trim() || undefined,
        db: parseOptionalNonNegativeInteger(process.env.REDIS_DB, 'REDIS_DB')
      }
    }
  };
}
