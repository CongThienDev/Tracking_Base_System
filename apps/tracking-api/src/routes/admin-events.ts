import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { SUPPORTED_DELIVERY_DESTINATIONS, type DeliveryDestination, type DeliveryJobDispatcher } from '../services/delivery-job-dispatcher.js';
import type { EventReadRepository } from '../types/admin-events.js';

type AdminEventsRouteOptions = {
  eventReadRepository: EventReadRepository;
  deliveryJobDispatcher: DeliveryJobDispatcher;
};

type DeliveryOverallStatus = 'queued' | 'success' | 'failed';
type SortBy = 'created_at' | 'event_timestamp' | 'event_name';
type SortOrder = 'asc' | 'desc';

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

function parseDateParam(value: unknown): string | undefined {
  const parsed = parseTextParam(value);
  if (!parsed) {
    return undefined;
  }

  return Number.isNaN(Date.parse(parsed)) ? undefined : parsed;
}

function parseDeliveryOverallStatus(value: unknown): DeliveryOverallStatus | undefined {
  if (value === 'queued' || value === 'success' || value === 'failed') {
    return value;
  }

  return undefined;
}

function parseSortBy(value: unknown): SortBy | undefined {
  if (value === 'created_at' || value === 'event_timestamp' || value === 'event_name') {
    return value;
  }

  return undefined;
}

function parseSortOrder(value: unknown): SortOrder | undefined {
  if (value === 'asc' || value === 'desc') {
    return value;
  }

  return undefined;
}

function parseDestinationList(value: unknown): DeliveryDestination[] | null {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const parsed: DeliveryDestination[] = [];

  for (const item of value) {
    if (typeof item !== 'string') {
      return null;
    }

    const trimmed = item.trim();
    if (!trimmed.length) {
      return null;
    }

    if (!SUPPORTED_DELIVERY_DESTINATIONS.includes(trimmed as DeliveryDestination)) {
      return null;
    }

    parsed.push(trimmed as DeliveryDestination);
  }

  return parsed;
}

function buildEventResponse(event: Awaited<ReturnType<EventReadRepository['getEventById']>>) {
  if (!event) {
    return null;
  }

  return {
    eventId: event.eventId,
    eventName: event.eventName,
    eventTimestamp: event.eventTimestamp,
    sessionId: event.sessionId,
    source: event.source,
    campaign: event.campaign,
    routeStatus: event.routeStatus,
    eventValue: event.eventValue,
    currency: event.currency,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    userId: event.userId,
    emailHash: event.emailHash,
    anonymousId: event.anonymousId,
    adId: event.adId,
    gclid: event.gclid,
    ttclid: event.ttclid,
    customerType: event.customerType,
    payload: event.payload,
    ingestIp: event.ingestIp,
    userAgent: event.userAgent,
    deliveries: event.deliveries,
    deliveryOverallStatus: event.deliveryOverallStatus
  };
}

async function replyNotFound(reply: FastifyReply): Promise<FastifyReply> {
  return reply.code(404).send({
    status: 'error',
    code: 'not_found',
    message: 'Event not found'
  });
}

export function adminEventsRoute(options: AdminEventsRouteOptions): FastifyPluginAsync {
  return async function registerAdminEventsRoute(app): Promise<void> {
    app.get('/admin/events', async (request, reply) => {
      const query = (request.query as Record<string, unknown>) ?? {};
      const limit = Math.min(100, Math.max(1, parseNumberParam(query.limit, 25)));
      const offset = Math.max(0, parseNumberParam(query.offset, 0));
      const eventName = parseTextParam(query.event_name);
      const source = parseTextParam(query.source);
      const deliveryOverallStatus = parseDeliveryOverallStatus(query.delivery_status);
      const from = parseDateParam(query.from);
      const to = parseDateParam(query.to);
      const destination = parseTextParam(query.destination);
      const eventId = parseTextParam(query.event_id);
      const eventIdLike = parseTextParam(query.event_id_like);
      const sortBy = parseSortBy(query.sort_by);
      const sortOrder = parseSortOrder(query.sort_order);

      const result = await options.eventReadRepository.listRecentEvents({
        limit,
        offset,
        eventName,
        source,
        deliveryOverallStatus,
        from,
        to,
        destination,
        eventId,
        eventIdLike,
        sortBy,
        sortOrder
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

    app.get('/admin/events/:event_id', async (request, reply) => {
      const eventId = parseTextParam((request.params as Record<string, unknown>)?.event_id);
      if (!eventId) {
        return replyNotFound(reply);
      }

      const event = await options.eventReadRepository.getEventById(eventId);
      if (!event) {
        return replyNotFound(reply);
      }

      return reply.code(200).send({
        status: 'ok',
        event: buildEventResponse(event)
      });
    });

    app.post('/admin/events/:event_id/replay', async (request, reply) => {
      const eventId = parseTextParam((request.params as Record<string, unknown>)?.event_id);
      if (!eventId) {
        return replyNotFound(reply);
      }

      const event = await options.eventReadRepository.getEventById(eventId);
      if (!event) {
        return replyNotFound(reply);
      }

      const body = (request.body as Record<string, unknown> | undefined) ?? {};
      const destinations = parseDestinationList(body.destinations);
      if (destinations === null) {
        return reply.code(400).send({
          status: 'error',
          code: 'validation_error',
          message: 'destinations must be an array of supported destination names'
        });
      }

      const replayResult = await options.eventReadRepository.replayEventDeliveries({
        eventId,
        destinations: destinations.length > 0 ? destinations : undefined
      });

      const replayDestinations = replayResult.destinations.filter((destination): destination is DeliveryDestination =>
        SUPPORTED_DELIVERY_DESTINATIONS.includes(destination as DeliveryDestination)
      );

      if (replayDestinations.length > 0) {
        await options.deliveryJobDispatcher.enqueueDeliveryJobs({
          eventId,
          destinations: replayDestinations,
          replayTag: new Date().toISOString()
        });
      }

      const refreshedEvent = await options.eventReadRepository.getEventById(eventId);
      if (!refreshedEvent) {
        return replyNotFound(reply);
      }

      return reply.code(200).send({
        status: 'ok',
        event: buildEventResponse(refreshedEvent),
        replayedDestinations: replayDestinations
      });
    });
  };
}
