import type { RedisOptions } from 'ioredis';

export type RedisConnectionConfig = {
  url?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  db?: number;
  connectionName?: string;
  lazyConnect?: boolean;
};

export function createRedisConnection(config: RedisConnectionConfig): RedisOptions {
  if (config.url) {
    const parsedUrl = new URL(config.url);
    const parsedDb = parsedUrl.pathname.length > 1 ? Number.parseInt(parsedUrl.pathname.slice(1), 10) : undefined;

    return {
      host: parsedUrl.hostname,
      port: parsedUrl.port ? Number.parseInt(parsedUrl.port, 10) : 6379,
      username: parsedUrl.username || undefined,
      password: parsedUrl.password || undefined,
      db: Number.isInteger(parsedDb) ? parsedDb : undefined,
      connectionName: config.connectionName,
      enableReadyCheck: false,
      lazyConnect: config.lazyConnect ?? true,
      maxRetriesPerRequest: null,
      tls: parsedUrl.protocol === 'rediss:' ? {} : undefined
    };
  }

  return {
    host: config.host ?? '127.0.0.1',
    port: config.port ?? 6379,
    username: config.username,
    password: config.password,
    db: config.db,
    connectionName: config.connectionName,
    enableReadyCheck: false,
    lazyConnect: config.lazyConnect ?? true,
    maxRetriesPerRequest: null
  };
}
