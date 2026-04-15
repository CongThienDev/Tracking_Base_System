import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import type { AppConfig } from '../../src/config.js';
import { InMemoryEventReadRepository } from '../support/fakes.js';

function buildTestConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    nodeEnv: 'development',
    port: 0,
    databaseUrl: 'postgres://unused',
    cors: {
      allowOrigins: []
    },
    observability: {
      metricsEnabled: true
    },
    security: {
      authMode: 'off',
      adminApiToken: undefined,
      signatureSkewSeconds: 300,
      rateLimit: {
        enabled: false,
        windowMs: 60_000,
        maxRequests: 100
      }
    },
    routerQueue: {
      queueName: 'router-deliveries',
      redis: {}
    },
    ...overrides
  };
}

describe('admin auth guard', () => {
  it('allows admin requests in development when no token is configured', async () => {
    const app = buildApp({
      config: buildTestConfig(),
      eventReadRepository: new InMemoryEventReadRepository()
    });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/events'
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-admin-auth-warning']).toBeDefined();

    await app.close();
  });

  it('rejects admin requests when the token is configured but missing', async () => {
    const app = buildApp({
      config: buildTestConfig({
        security: {
          authMode: 'off',
          adminApiToken: 'internal-secret',
          signatureSkewSeconds: 300,
          rateLimit: {
            enabled: false,
            windowMs: 60_000,
            maxRequests: 100
          }
        }
      }),
      eventReadRepository: new InMemoryEventReadRepository()
    });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/events'
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      status: 'error',
      code: 'unauthorized'
    });

    await app.close();
  });

  it('accepts the configured token on admin requests', async () => {
    const app = buildApp({
      config: buildTestConfig({
        security: {
          authMode: 'off',
          adminApiToken: 'internal-secret',
          signatureSkewSeconds: 300,
          rateLimit: {
            enabled: false,
            windowMs: 60_000,
            maxRequests: 100
          }
        }
      }),
      eventReadRepository: new InMemoryEventReadRepository()
    });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/events',
      headers: {
        ADMIN_API_TOKEN: 'internal-secret'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-admin-auth-warning']).toBeUndefined();

    await app.close();
  });
});
