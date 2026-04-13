import { buildApp } from './app.js';
import { getConfig } from './config.js';

async function start(): Promise<void> {
  const config = getConfig();
  const app = buildApp();

  await app.listen({
    host: '0.0.0.0',
    port: config.port
  });
}

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
