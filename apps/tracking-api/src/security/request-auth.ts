import { createHmac, timingSafeEqual } from 'node:crypto';

export type RequestAuthCode = 'missing' | 'invalid' | 'expired';

export type RequestAuthResult = {
  ok: boolean;
  code?: RequestAuthCode;
  reason?: string;
};

export type RequestAuthHeaders = {
  'x-tracking-secret'?: string | string[];
  'x-tracking-timestamp'?: string | string[];
  'x-tracking-signature'?: string | string[];
};

export type SharedSecretAuthInput = {
  mode: 'shared-secret';
  secret: string;
  headers: RequestAuthHeaders;
};

export type SignedRequestAuthInput = {
  mode: 'signing';
  secret: string;
  headers: RequestAuthHeaders;
  eventId: string;
  eventName: string;
  sessionId: string;
  timestampSkewSeconds: number;
  nowMs?: number;
};

export type RequestAuthInput = SharedSecretAuthInput | SignedRequestAuthInput;

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

  return value.length > 0 ? value : undefined;
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function signTrackingRequest(
  secret: string,
  timestamp: string,
  eventId: string,
  eventName: string,
  sessionId: string
): string {
  return createHmac('sha256', secret)
    .update(`${timestamp}.${eventId}.${eventName}.${sessionId}`)
    .digest('hex');
}

function parseTimestampMillis(rawTimestamp: string): number | null {
  if (!/^-?\d+$/.test(rawTimestamp)) {
    return null;
  }

  const numericTimestamp = Number(rawTimestamp);
  if (!Number.isSafeInteger(numericTimestamp)) {
    return null;
  }

  return Math.abs(numericTimestamp) < 100_000_000_000
    ? numericTimestamp * 1000
    : numericTimestamp;
}

function verifySharedSecret(input: SharedSecretAuthInput): RequestAuthResult {
  const headerSecret = normalizeHeaderValue(readHeaderValue(input.headers['x-tracking-secret']));
  if (headerSecret === undefined) {
    return {
      ok: false,
      code: 'missing',
      reason: 'x-tracking-secret header is required'
    };
  }

  if (!constantTimeEqual(headerSecret, input.secret)) {
    return {
      ok: false,
      code: 'invalid',
      reason: 'x-tracking-secret header did not match the configured secret'
    };
  }

  return { ok: true };
}

function verifySignedRequest(input: SignedRequestAuthInput): RequestAuthResult {
  const timestamp = normalizeHeaderValue(readHeaderValue(input.headers['x-tracking-timestamp']));
  if (timestamp === undefined) {
    return {
      ok: false,
      code: 'missing',
      reason: 'x-tracking-timestamp header is required'
    };
  }

  const signature = normalizeHeaderValue(readHeaderValue(input.headers['x-tracking-signature']));
  if (signature === undefined) {
    return {
      ok: false,
      code: 'missing',
      reason: 'x-tracking-signature header is required'
    };
  }

  const timestampMs = parseTimestampMillis(timestamp);
  if (timestampMs === null) {
    return {
      ok: false,
      code: 'invalid',
      reason: 'x-tracking-timestamp header must be an integer Unix timestamp in seconds or milliseconds'
    };
  }

  const nowMs = input.nowMs ?? Date.now();
  const maxSkewMs = Math.max(0, Math.trunc(input.timestampSkewSeconds)) * 1000;
  if (Math.abs(nowMs - timestampMs) > maxSkewMs) {
    return {
      ok: false,
      code: 'expired',
      reason: 'x-tracking-timestamp is outside the allowed skew window'
    };
  }

  const expectedSignature = signTrackingRequest(
    input.secret,
    timestamp,
    input.eventId,
    input.eventName,
    input.sessionId
  );

  if (!constantTimeEqual(signature, expectedSignature)) {
    return {
      ok: false,
      code: 'invalid',
      reason: 'x-tracking-signature did not match the expected HMAC'
    };
  }

  return { ok: true };
}

export function verifyRequestAuth(input: RequestAuthInput): RequestAuthResult {
  if (input.mode === 'shared-secret') {
    return verifySharedSecret(input);
  }

  return verifySignedRequest(input);
}
