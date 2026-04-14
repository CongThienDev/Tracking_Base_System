import { timingSafeEqual } from 'node:crypto';
import type { FastifyBaseLogger, FastifyReply, FastifyRequest } from 'fastify';

export type AdminAuthHeaders = {
  admin_api_token?: string | string[];
};

export type AdminAuthGuardOptions = {
  token?: string;
  allowOpenWithoutToken: boolean;
  logger: Pick<FastifyBaseLogger, 'warn'>;
};

function readHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeHeaderValue(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createAdminAuthGuard(options: AdminAuthGuardOptions) {
  let warnedAboutOpenAccess = false;

  return async function adminAuthGuard(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    if (!options.token) {
      if (options.allowOpenWithoutToken) {
        if (!warnedAboutOpenAccess) {
          options.logger.warn(
            'ADMIN_API_TOKEN is not set; admin endpoints are open in development/test until you configure one'
          );
          warnedAboutOpenAccess = true;
        }

        reply.header(
          'x-admin-auth-warning',
          'ADMIN_API_TOKEN is not set; admin endpoints are open in development/test'
        );
        return true;
      }

      reply.code(401).send({
        status: 'error',
        code: 'unauthorized',
        message: 'ADMIN_API_TOKEN is required for admin endpoints'
      });
      return false;
    }

    const headerToken = normalizeHeaderValue(readHeaderValue((request.headers as AdminAuthHeaders).admin_api_token));
    if (!headerToken || !constantTimeEqual(headerToken, options.token)) {
      reply.code(401).send({
        status: 'error',
        code: 'unauthorized',
        message: 'Invalid admin authentication token'
      });
      return false;
    }

    return true;
  };
}
