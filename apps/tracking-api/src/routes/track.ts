import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { dispatchDeliveryJob } from '../services/dispatch-delivery-job.js';
import { normalizeTrackEvent, ValidationError } from '../services/normalize-track-event.js';
import type { DeliveryJobDispatcher } from '../services/delivery-job-dispatcher.js';
import type { EventRepository } from '../types/track.js';

type TrackRouteOptions = {
  eventRepository: EventRepository;
  deliveryJobDispatcher: DeliveryJobDispatcher;
  preHandle?: (request: FastifyRequest, reply: FastifyReply) => Promise<boolean>;
  metrics?: {
    recordTrackRequest: () => void;
    recordSuccess: (options: { deduplicated: boolean }) => void;
    recordValidationError: () => void;
    recordInternalError: () => void;
  };
  logger: {
    error: (object: unknown, message?: string) => void;
  };
};

export function trackRoute(options: TrackRouteOptions): FastifyPluginAsync {
  return async function registerTrackRoute(app): Promise<void> {
    app.post('/track', async (request, reply) => {
      options.metrics?.recordTrackRequest();

      if (options.preHandle) {
        const shouldContinue = await options.preHandle(request, reply);
        if (!shouldContinue) {
          return;
        }
      }

      const contentType = request.headers['content-type'];
      if (!contentType || !contentType.toLowerCase().includes('application/json')) {
        options.metrics?.recordValidationError();
        return reply.code(415).send({
          status: 'error',
          code: 'unsupported_media_type',
          message: 'Content-Type must be application/json'
        });
      }

      try {
        const normalized = normalizeTrackEvent({
          payload: request.body,
          ip: request.ip ?? null,
          userAgent: request.headers['user-agent'] ?? null
        });

        const result = await options.eventRepository.insertIfNotExists(normalized);

        if (result.inserted) {
          dispatchDeliveryJob({
            dispatcher: options.deliveryJobDispatcher,
            event: normalized,
            logger: options.logger
          });
        }

        options.metrics?.recordSuccess({ deduplicated: !result.inserted });
        return reply.code(200).send({
          status: 'ok',
          event_id: normalized.eventId,
          deduplicated: !result.inserted
        });
      } catch (error) {
        if (error instanceof ValidationError) {
          options.metrics?.recordValidationError();
          return reply.code(400).send({
            status: 'error',
            code: 'validation_error',
            message: error.message
          });
        }

        options.metrics?.recordInternalError();
        options.logger.error({ err: error }, 'track endpoint failed');
        return reply.code(500).send({
          status: 'error',
          code: 'internal_error',
          message: 'Internal server error'
        });
      }
    });
  };
}
