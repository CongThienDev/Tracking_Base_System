import type { FastifyPluginAsync } from 'fastify';
import type { EventReadRepository } from '../types/admin-events.js';

type AdminEventsRouteOptions = {
  eventReadRepository: EventReadRepository;
};

type DeliveryOverallStatus = 'queued' | 'success' | 'failed';

function parseNumberParam(value: unknown, fallback: number): number {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return parsed;
}

function parseTextParam(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseDeliveryOverallStatus(value: unknown): DeliveryOverallStatus | undefined {
  if (value === 'queued' || value === 'success' || value === 'failed') {
    return value;
  }
  return undefined;
}

export function adminEventsRoute(options: AdminEventsRouteOptions): FastifyPluginAsync {
  return async function registerAdminEventsRoute(app): Promise<void> {
    app.get('/admin/events', async (request, reply) => {
      const query = (request.query as Record<string, unknown>) ?? {};
      const limit = Math.min(100, Math.max(1, parseNumberParam((request.query as Record<string, unknown>)?.limit, 25)));
      const offset = Math.max(0, parseNumberParam((request.query as Record<string, unknown>)?.offset, 0));
      const eventName = parseTextParam(query.event_name);
      const source = parseTextParam(query.source);
      const deliveryOverallStatus = parseDeliveryOverallStatus(query.delivery_status);

      const result = await options.eventReadRepository.listRecentEvents({
        limit,
        offset,
        eventName,
        source,
        deliveryOverallStatus
      });

      return reply.code(200).send({
        status: 'ok',
        paging: {
          limit,
          offset,
          total: result.total
        },
        items: result.items
      });
    });
  };
}
