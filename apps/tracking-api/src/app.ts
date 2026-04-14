import Fastify, { type FastifyBaseLogger, type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { getConfig, type AppConfig } from './config.js';
import { getDbPool } from './db/client.js';
import { createIngestionMetrics } from './observability/ingestion-metrics.js';
import { PostgresEventRepository } from './repositories/postgres-event-repository.js';
import { PostgresEventReadRepository } from './repositories/postgres-event-read-repository.js';
import { adminEventsRoute } from './routes/admin-events.js';
import { trackRoute } from './routes/track.js';
import type { RequestAuthHeaders } from './security/request-auth.js';
import { verifyRequestAuth } from './security/request-auth.js';
import { InMemoryRateLimiter } from './security/rate-limit.js';
import {
  createBullMqDeliveryJobDispatcher,
  NoopDeliveryJobDispatcher,
  type DeliveryJobDispatcher
} from './services/delivery-job-dispatcher.js';
import type { EventReadRepository } from './types/admin-events.js';
import type { EventRepository } from './types/track.js';

type BuildAppOptions = {
  eventRepository?: EventRepository;
  eventReadRepository?: EventReadRepository;
  deliveryJobDispatcher?: DeliveryJobDispatcher;
  logger?: Pick<FastifyBaseLogger, 'error'>;
  config?: AppConfig;
};

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: true
  });

  let config: AppConfig | undefined;
  const resolveConfig = () => {
    if (!config) {
      if (options.config) {
        config = options.config;
      } else {
        try {
          config = getConfig();
        } catch (error) {
          if (options.eventRepository || options.deliveryJobDispatcher) {
            config = {
              nodeEnv: 'test',
              port: 0,
              databaseUrl: '',
              observability: {
                metricsEnabled: true
              },
              security: {
                authMode: 'off',
                signatureSkewSeconds: 300,
                rateLimit: {
                  enabled: false,
                  windowMs: 60_000,
                  maxRequests: 120
                }
              },
              routerQueue: {
                queueName: 'router-deliveries',
                redis: {}
              }
            };
          } else {
            throw error;
          }
        }
      }
    }

    return config;
  };

  const eventRepository =
    options.eventRepository ?? new PostgresEventRepository(getDbPool(resolveConfig().databaseUrl));
  const eventReadRepository =
    options.eventReadRepository ?? new PostgresEventReadRepository(getDbPool(resolveConfig().databaseUrl));
  const deliveryJobDispatcher =
    options.deliveryJobDispatcher ??
    (resolveConfig().routerQueue.redis.url || resolveConfig().routerQueue.redis.host
      ? createBullMqDeliveryJobDispatcher(resolveConfig().routerQueue)
      : new NoopDeliveryJobDispatcher());
  const logger = options.logger ?? app.log;
  const metrics = createIngestionMetrics();
  let rateLimiter: InMemoryRateLimiter | null | undefined;
  const getRateLimiter = (): InMemoryRateLimiter | null => {
    if (rateLimiter !== undefined) {
      return rateLimiter;
    }

    const rateLimitConfig = resolveConfig().security.rateLimit;
    rateLimiter = rateLimitConfig.enabled
      ? new InMemoryRateLimiter({
          windowMs: rateLimitConfig.windowMs,
          maxRequests: rateLimitConfig.maxRequests
        })
      : null;

    return rateLimiter;
  };

  const preHandleTrackRequest = async (request: FastifyRequest, reply: FastifyReply): Promise<boolean> => {
    const securityConfig = resolveConfig().security;

    if (securityConfig.authMode !== 'off') {
      const payload = (request.body ?? {}) as {
        event_id?: unknown;
        event_name?: unknown;
        session?: {
          session_id?: unknown;
        };
      };
      const eventId = typeof payload.event_id === 'string' ? payload.event_id : '';
      const eventName = typeof payload.event_name === 'string' ? payload.event_name : '';
      const sessionId = typeof payload.session?.session_id === 'string' ? payload.session.session_id : '';

      const authResult =
        securityConfig.authMode === 'shared-secret'
          ? verifyRequestAuth({
              mode: 'shared-secret',
              secret: securityConfig.authSecret ?? '',
              headers: request.headers as RequestAuthHeaders
            })
          : verifyRequestAuth({
              mode: 'signing',
              secret: securityConfig.authSecret ?? '',
              headers: request.headers as RequestAuthHeaders,
              eventId,
              eventName,
              sessionId,
              timestampSkewSeconds: securityConfig.signatureSkewSeconds
            });

      if (!authResult.ok) {
        metrics.recordAuthFailed();
        reply.code(401).send({
          status: 'error',
          code: 'unauthorized',
          message: 'Invalid authentication credentials'
        });
        return false;
      }
    }

    const limiter = getRateLimiter();
    if (limiter) {
      const decision = limiter.checkAndConsume(request.ip ?? 'unknown');
      if (!decision.allowed) {
        metrics.recordRateLimited();
        const retryAfterSeconds = Math.max(1, Math.ceil((decision.resetAt - Date.now()) / 1000));
        reply.header('retry-after', String(retryAfterSeconds));
        reply.code(429).send({
          status: 'error',
          code: 'rate_limited',
          message: 'Too many requests. Please retry later.'
        });
        return false;
      }
    }

    return true;
  };

  app.addHook('onClose', async () => {
    await deliveryJobDispatcher.close?.();
  });

  app.register(
    trackRoute({
      eventRepository,
      deliveryJobDispatcher,
      preHandle: preHandleTrackRequest,
      metrics,
      logger
    })
  );
  app.register(
    adminEventsRoute({
      eventReadRepository
    })
  );

  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/ready', async (_request, reply) => {
    try {
      await getDbPool(resolveConfig().databaseUrl).query('select 1');
      return { status: 'ready' };
    } catch (error) {
      logger.error({ err: error }, 'readiness probe failed');
      return reply.code(503).send({ status: 'not_ready' });
    }
  });

  app.get('/metrics', async (_request, reply) => {
    if (!resolveConfig().observability.metricsEnabled) {
      return reply.code(404).send({ status: 'error', code: 'disabled' });
    }

    return {
      status: 'ok',
      counters: metrics.snapshot()
    };
  });

  return app;
}
