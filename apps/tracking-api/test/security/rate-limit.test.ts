import { describe, expect, it } from 'vitest';
import { InMemoryRateLimiter } from '../../src/security/rate-limit.js';

describe('InMemoryRateLimiter', () => {
  it('allows requests until the limit is reached and then blocks within the same window', () => {
    const limiter = new InMemoryRateLimiter({
      windowMs: 1000,
      maxRequests: 2
    });

    expect(limiter.checkAndConsume('ip:127.0.0.1', 0)).toEqual({
      allowed: true,
      remaining: 1,
      resetAt: 1000
    });

    expect(limiter.checkAndConsume('ip:127.0.0.1', 1)).toEqual({
      allowed: true,
      remaining: 0,
      resetAt: 1000
    });

    expect(limiter.checkAndConsume('ip:127.0.0.1', 2)).toEqual({
      allowed: false,
      remaining: 0,
      resetAt: 1000
    });
  });

  it('resets the counter when the window rolls over', () => {
    const limiter = new InMemoryRateLimiter({
      windowMs: 1000,
      maxRequests: 2
    });

    limiter.checkAndConsume('client:abc', 0);
    limiter.checkAndConsume('client:abc', 1);

    expect(limiter.checkAndConsume('client:abc', 999)).toEqual({
      allowed: false,
      remaining: 0,
      resetAt: 1000
    });

    expect(limiter.checkAndConsume('client:abc', 1000)).toEqual({
      allowed: true,
      remaining: 1,
      resetAt: 2000
    });
  });

  it('tracks different keys independently', () => {
    const limiter = new InMemoryRateLimiter({
      windowMs: 1000,
      maxRequests: 1
    });

    expect(limiter.checkAndConsume('ip:10.0.0.1', 10)).toMatchObject({
      allowed: true,
      remaining: 0,
      resetAt: 1000
    });

    expect(limiter.checkAndConsume('ip:10.0.0.2', 10)).toMatchObject({
      allowed: true,
      remaining: 0,
      resetAt: 1000
    });

    expect(limiter.checkAndConsume('ip:10.0.0.1', 11)).toMatchObject({
      allowed: false,
      remaining: 0,
      resetAt: 1000
    });
  });
});
