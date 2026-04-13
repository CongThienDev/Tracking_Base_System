export class RetryableDeliveryError extends Error {
  readonly retryable = true;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'RetryableDeliveryError';
  }
}

export class TerminalDeliveryError extends Error {
  readonly retryable = false;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'TerminalDeliveryError';
  }
}

export function isRetryableDeliveryError(error: unknown): boolean {
  if (error instanceof RetryableDeliveryError) {
    return true;
  }

  if (error instanceof TerminalDeliveryError) {
    return false;
  }

  if (typeof error === 'object' && error !== null && 'retryable' in error) {
    return (error as { retryable?: unknown }).retryable === true;
  }

  return true;
}
