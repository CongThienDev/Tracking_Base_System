import { getRouterWorkerConfig } from './config.js';
import { createRouterWorker } from './runtime/router-worker-runtime.js';

async function start(): Promise<void> {
  const config = getRouterWorkerConfig();
  const runtime = createRouterWorker(config);

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log(`received ${signal}, shutting down router worker`);
    await runtime.close();
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
