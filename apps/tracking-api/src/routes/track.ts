import type { FastifyPluginAsync } from 'fastify';
import { dispatchDeliveryJob } from '../services/dispatch-delivery-job.js';
import { normalizeTrackEvent, ValidationError } from '../services/normalize-track-event.js';
import type { DeliveryJobDispatcher } from '../services/delivery-job-dispatcher.js';
import type { EventRepository } from '../types/track.js';

type TrackRouteOptions = {
  eventRepository: EventRepository;
  deliveryJobDispatcher: DeliveryJobDispatcher;
  logger: {
    error: (object: unknown, message?: string) => void;
  };
};

export function trackRoute(options: TrackRouteOptions): FastifyPluginAsync {
  return async function registerTrackRoute(app): Promise<void> {
    app.post('/track', async (request, reply) => {
      const contentType = request.headers['content-type'];
      if (!contentType || !contentType.toLowerCase().includes('application/json')) {
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

        return reply.code(200).send({
          status: 'ok',
          event_id: normalized.eventId,
          deduplicated: !result.inserted
        });
      } catch (error) {
        if (error instanceof ValidationError) {
          return reply.code(400).send({
            status: 'error',
            code: 'validation_error',
            message: error.message
          });
        }

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
