import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_PORT = 3000;
const DEFAULT_REDIS_PORT = 6379;

export type AppConfig = {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  observability: {
    metricsEnabled: boolean;
  };
  security: {
    authMode: 'off' | 'shared-secret' | 'signing';
    authSecret?: string;
    adminApiToken?: string;
    signatureSkewSeconds: number;
    rateLimit: {
      enabled: boolean;
      windowMs: number;
      maxRequests: number;
    };
  };
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

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  throw new Error(`Invalid boolean value: ${value}`);
}

function parseRequiredAuthMode(value: string | undefined): 'off' | 'shared-secret' | 'signing' {
  const normalized = (value ?? 'off').trim().toLowerCase();
  if (normalized === 'off' || normalized === 'shared-secret' || normalized === 'signing') {
    return normalized;
  }

  throw new Error(`TRACKING_API_AUTH_MODE must be one of: off, shared-secret, signing`);
}

function isDevLikeEnvironment(nodeEnv: string): boolean {
  return nodeEnv === 'development' || nodeEnv === 'test';
}

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

  const authMode = parseRequiredAuthMode(process.env.TRACKING_API_AUTH_MODE);
  const authSecret = process.env.TRACKING_API_SECRET?.trim() || undefined;
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const adminApiToken = process.env.ADMIN_API_TOKEN?.trim() || undefined;

  if (authMode !== 'off' && !authSecret) {
    throw new Error('TRACKING_API_SECRET is required when TRACKING_API_AUTH_MODE is enabled');
  }

  if (!adminApiToken && !isDevLikeEnvironment(nodeEnv)) {
    throw new Error('ADMIN_API_TOKEN is required outside development/test');
  }

  return {
    nodeEnv,
    port,
    databaseUrl,
    observability: {
      metricsEnabled: parseBoolean(process.env.METRICS_ENABLED, true)
    },
    security: {
      authMode,
      authSecret,
      adminApiToken,
      signatureSkewSeconds: parseOptionalPositiveInteger(process.env.TRACKING_SIGNATURE_SKEW_SECONDS, 'TRACKING_SIGNATURE_SKEW_SECONDS') ?? 300,
      rateLimit: {
        enabled: parseBoolean(process.env.TRACKING_RATE_LIMIT_ENABLED, false),
        windowMs: parseOptionalPositiveInteger(process.env.TRACKING_RATE_LIMIT_WINDOW_MS, 'TRACKING_RATE_LIMIT_WINDOW_MS') ?? 60_000,
        maxRequests: parseOptionalPositiveInteger(process.env.TRACKING_RATE_LIMIT_MAX_REQUESTS, 'TRACKING_RATE_LIMIT_MAX_REQUESTS') ?? 120
      }
    },
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
