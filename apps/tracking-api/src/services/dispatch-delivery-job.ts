import type { FastifyBaseLogger } from 'fastify';
import type { NormalizedTrackEvent } from '../types/track.js';
import type { DeliveryJobDispatcher } from './delivery-job-dispatcher.js';

type DispatchDeliveryJobOptions = {
  dispatcher: DeliveryJobDispatcher;
  event: NormalizedTrackEvent;
  logger: Pick<FastifyBaseLogger, 'error'>;
};

export function dispatchDeliveryJob(options: DispatchDeliveryJobOptions): void {
  void Promise.resolve(options.dispatcher.enqueueDeliveryJob(options.event)).catch((error) => {
    options.logger.error(
      {
        err: error,
        eventId: options.event.eventId
      },
      'failed to enqueue delivery job'
    );
  });
}
