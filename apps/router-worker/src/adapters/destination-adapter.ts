import type { DeliveryJobEnvelope } from '../types.js';

export interface DestinationAdapter {
  readonly destination: string;
  // Runtime enriches the envelope with the canonical event before adapters run.
  deliver(job: DeliveryJobEnvelope): Promise<void>;
}

export type DestinationAdapterRegistry = Readonly<Record<string, DestinationAdapter>>;
