import Fastify, { type FastifyInstance } from 'fastify';
import { getConfig } from './config.js';
import { getDbPool } from './db/client.js';
import { PostgresEventRepository } from './repositories/postgres-event-repository.js';
import { trackRoute } from './routes/track.js';
import type { EventRepository } from './types/track.js';

type BuildAppOptions = {
  eventRepository?: EventRepository;
};

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: true
  });

  const eventRepository = options.eventRepository ?? new PostgresEventRepository(getDbPool(getConfig().databaseUrl));

  app.register(trackRoute({ eventRepository }));

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
