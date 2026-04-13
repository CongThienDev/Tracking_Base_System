export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export type InMemoryRateLimiterConfig = {
  windowMs: number;
  maxRequests: number;
};

type RateLimitBucket = {
  windowStartMs: number;
  consumed: number;
};

export class InMemoryRateLimiter {
  private readonly windowMs: number;

  private readonly maxRequests: number;

  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(config: InMemoryRateLimiterConfig) {
    if (!Number.isFinite(config.windowMs) || config.windowMs <= 0) {
      throw new Error('windowMs must be a positive finite number');
    }

    if (!Number.isFinite(config.maxRequests) || config.maxRequests <= 0) {
      throw new Error('maxRequests must be a positive finite number');
    }

    this.windowMs = Math.trunc(config.windowMs);
    this.maxRequests = Math.trunc(config.maxRequests);
  }

  checkAndConsume(key: string, nowMs: number = Date.now()): RateLimitDecision {
    const windowStartMs = Math.floor(nowMs / this.windowMs) * this.windowMs;
    const resetAt = windowStartMs + this.windowMs;
    const existingBucket = this.buckets.get(key);

    if (!existingBucket || existingBucket.windowStartMs !== windowStartMs) {
      const bucket: RateLimitBucket = {
        windowStartMs,
        consumed: 0
      };
      this.buckets.set(key, bucket);
      return this.consume(bucket, resetAt);
    }

    return this.consume(existingBucket, resetAt);
  }

  private consume(bucket: RateLimitBucket, resetAt: number): RateLimitDecision {
    if (bucket.consumed >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt
      };
    }

    bucket.consumed += 1;

    return {
      allowed: true,
      remaining: this.maxRequests - bucket.consumed,
      resetAt
    };
  }
}
