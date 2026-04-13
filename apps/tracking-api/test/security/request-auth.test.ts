import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyRequestAuth } from '../../src/security/request-auth.js';

function makeSignature(
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

describe('verifyRequestAuth', () => {
  it('verifies shared-secret mode when the header matches', () => {
    const result = verifyRequestAuth({
      mode: 'shared-secret',
      secret: 'top-secret',
      headers: {
        'x-tracking-secret': 'top-secret'
      }
    });

    expect(result).toEqual({ ok: true });
  });

  it('returns missing when the shared-secret header is absent', () => {
    const result = verifyRequestAuth({
      mode: 'shared-secret',
      secret: 'top-secret',
      headers: {}
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'missing'
    });
  });

  it('returns invalid when the shared-secret header does not match', () => {
    const result = verifyRequestAuth({
      mode: 'shared-secret',
      secret: 'top-secret',
      headers: {
        'x-tracking-secret': 'wrong-secret'
      }
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'invalid'
    });
  });

  it('verifies signing mode with a valid signature within the allowed skew', () => {
    const timestamp = '1712966400';
    const secret = 'top-secret';
    const eventId = 'evt-001';
    const eventName = 'purchase';
    const sessionId = 'sess-001';

    const result = verifyRequestAuth({
      mode: 'signing',
      secret,
      headers: {
        'x-tracking-timestamp': timestamp,
        'x-tracking-signature': makeSignature(secret, timestamp, eventId, eventName, sessionId)
      },
      eventId,
      eventName,
      sessionId,
      timestampSkewSeconds: 60,
      nowMs: 1_712_966_420_000
    });

    expect(result).toEqual({ ok: true });
  });

  it('returns missing when the signature header is absent', () => {
    const result = verifyRequestAuth({
      mode: 'signing',
      secret: 'top-secret',
      headers: {
        'x-tracking-timestamp': '1712966400'
      },
      eventId: 'evt-001',
      eventName: 'purchase',
      sessionId: 'sess-001',
      timestampSkewSeconds: 60,
      nowMs: 1_712_966_420_000
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'missing'
    });
  });

  it('returns invalid when the signature does not match', () => {
    const timestamp = '1712966400';

    const result = verifyRequestAuth({
      mode: 'signing',
      secret: 'top-secret',
      headers: {
        'x-tracking-timestamp': timestamp,
        'x-tracking-signature': 'deadbeef'
      },
      eventId: 'evt-001',
      eventName: 'purchase',
      sessionId: 'sess-001',
      timestampSkewSeconds: 60,
      nowMs: 1_712_966_420_000
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'invalid'
    });
  });

  it('returns invalid when the timestamp is malformed', () => {
    const result = verifyRequestAuth({
      mode: 'signing',
      secret: 'top-secret',
      headers: {
        'x-tracking-timestamp': 'not-a-timestamp',
        'x-tracking-signature': 'deadbeef'
      },
      eventId: 'evt-001',
      eventName: 'purchase',
      sessionId: 'sess-001',
      timestampSkewSeconds: 60,
      nowMs: 1_712_966_420_000
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'invalid'
    });
  });

  it('returns expired when the timestamp is outside the skew window', () => {
    const timestamp = '1712966340';
    const secret = 'top-secret';
    const eventId = 'evt-001';
    const eventName = 'purchase';
    const sessionId = 'sess-001';

    const result = verifyRequestAuth({
      mode: 'signing',
      secret,
      headers: {
        'x-tracking-timestamp': timestamp,
        'x-tracking-signature': makeSignature(secret, timestamp, eventId, eventName, sessionId)
      },
      eventId,
      eventName,
      sessionId,
      timestampSkewSeconds: 30,
      nowMs: 1_712_966_420_000
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'expired'
    });
  });
});
