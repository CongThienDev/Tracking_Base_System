import type { DeliveryJobEnvelope } from '../types.js';

export interface DestinationAdapter {
  readonly destination: string;
  deliver(job: DeliveryJobEnvelope): Promise<void>;
}

export type DestinationAdapterRegistry = Readonly<Record<string, DestinationAdapter>>;
