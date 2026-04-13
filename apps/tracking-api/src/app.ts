import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';
import { getConfig } from './config.js';
import { getDbPool } from './db/client.js';
import { PostgresEventRepository } from './repositories/postgres-event-repository.js';
import { trackRoute } from './routes/track.js';
import {
  createBullMqDeliveryJobDispatcher,
  NoopDeliveryJobDispatcher,
  type DeliveryJobDispatcher
} from './services/delivery-job-dispatcher.js';
import type { EventRepository } from './types/track.js';

type BuildAppOptions = {
  eventRepository?: EventRepository;
  deliveryJobDispatcher?: DeliveryJobDispatcher;
  logger?: Pick<FastifyBaseLogger, 'error'>;
};

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: true
  });

  let config: ReturnType<typeof getConfig> | undefined;
  const resolveConfig = () => {
    if (!config) {
      config = getConfig();
    }

    return config;
  };

  const eventRepository =
    options.eventRepository ?? new PostgresEventRepository(getDbPool(resolveConfig().databaseUrl));
  const deliveryJobDispatcher =
    options.deliveryJobDispatcher ??
    (resolveConfig().routerQueue.redis.url || resolveConfig().routerQueue.redis.host
      ? createBullMqDeliveryJobDispatcher(resolveConfig().routerQueue)
      : new NoopDeliveryJobDispatcher());
  const logger = options.logger ?? app.log;

  app.addHook('onClose', async () => {
    await deliveryJobDispatcher.close?.();
  });

  app.register(
    trackRoute({
      eventRepository,
      deliveryJobDispatcher,
      logger
    })
  );

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
