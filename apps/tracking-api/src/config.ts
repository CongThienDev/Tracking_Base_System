import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_PORT = 3000;

export type AppConfig = {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
};

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
    databaseUrl
  };
}
