import type { DeliveryJobEnvelope } from '../types.js';
import type { DestinationAdapter, DestinationAdapterRegistry } from './destination-adapter.js';

export class NoopDestinationAdapter implements DestinationAdapter {
  constructor(public readonly destination: string) {}

  async deliver(_job: DeliveryJobEnvelope): Promise<void> {
    return;
  }
}

export function createNoopDestinationAdapterRegistry(destinations: readonly string[]): DestinationAdapterRegistry {
  const registry: Record<string, DestinationAdapter> = {};

  for (const destination of destinations) {
    registry[destination] = new NoopDestinationAdapter(destination);
  }

  return Object.freeze(registry);
}
