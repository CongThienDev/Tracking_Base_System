import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  computeParityReport,
  loadCountsFromFile,
  main,
  parseArgs,
  parseThreshold
} from '../scripts/check-conversion-parity.js';

describe('check-conversion-parity', () => {
  const tempDirs: string[] = [];

  async function createJsonFile(fileName: string, data: unknown): Promise<string> {
    const tempDir = await mkdtemp(join(tmpdir(), 'tracking-parity-'));
    tempDirs.push(tempDir);

    const filePath = join(tempDir, fileName);
    await writeFile(filePath, JSON.stringify(data), 'utf8');

    return filePath;
  }

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it('computes deterministic parity metrics', () => {
    const report = computeParityReport(
      {
        purchase: 12,
        signup: 4
      },
      {
        purchase: 10,
        refund: 2
      },
      {
        newPath: '/tmp/new.json',
        legacyPath: '/tmp/legacy.json',
        threshold: 0.5
      }
    );

    expect(report.totals).toEqual({
      newTotal: 16,
      legacyTotal: 12,
      absoluteDelta: 8,
      mismatchRatio: 8 / 12
    });

    expect(report.perEvent).toEqual([
      {
        eventName: 'purchase',
        newCount: 12,
        legacyCount: 10,
        absoluteDelta: 2,
        mismatchRatio: 0.2
      },
      {
        eventName: 'refund',
        newCount: 0,
        legacyCount: 2,
        absoluteDelta: 2,
        mismatchRatio: 1
      },
      {
        eventName: 'signup',
        newCount: 4,
        legacyCount: 0,
        absoluteDelta: 4,
        mismatchRatio: 1
      }
    ]);

    expect(report.pass).toBe(false);
  });

  it('loads and aggregates event rows from dry-run JSON files', async () => {
    const filePath = await createJsonFile('new.json', {
      events: [
        { event_name: 'purchase' },
        { eventName: 'purchase', count: 2 },
        { event_name: 'signup', count: 3 }
      ]
    });

    await expect(loadCountsFromFile(filePath)).resolves.toEqual({
      purchase: 3,
      signup: 3
    });
  });

  it('validates threshold input', () => {
    expect(parseThreshold(undefined)).toBe(0);
    expect(parseThreshold('0.25')).toBe(0.25);
    expect(() => parseThreshold('-0.1')).toThrow('--threshold must be a number between 0 and 1');
    expect(() => parseThreshold('1.5')).toThrow('--threshold must be a number between 0 and 1');
    expect(() => parseThreshold('abc')).toThrow('--threshold must be a number between 0 and 1');
  });

  it('validates required CLI arguments', () => {
    expect(() => parseArgs(['--legacy-path', '/tmp/legacy.json'])).toThrow('--new-path is required');
    expect(() => parseArgs(['--new-path', '/tmp/new.json'])).toThrow('--legacy-path is required');
    expect(() => parseArgs(['--new-path'])).toThrow('Missing value for --new-path');
  });

  it('returns non-zero exit code when threshold fails', async () => {
    const out: string[] = [];
    const err: string[] = [];

    const exitCode = await main(
      ['--new-path', 'new.json', '--legacy-path', 'legacy.json', '--threshold', '0.1'],
      {
        out: (message) => out.push(message),
        err: (message) => err.push(message),
        loadCounts: async (filePath) => {
          if (filePath === 'new.json') {
            return { purchase: 10 };
          }

          return { purchase: 8 };
        }
      }
    );

    expect(exitCode).toBe(2);
    expect(out).toHaveLength(1);
    expect(JSON.parse(out[0] ?? '{}')).toMatchObject({
      totals: {
        mismatchRatio: 0.25
      },
      pass: false
    });
    expect(err[0]).toContain('Parity check failed');
  });

  it('returns exit code 1 for invalid dataset format', async () => {
    const newPath = await createJsonFile('new.json', [{ event_name: 'purchase' }]);
    const legacyPath = await createJsonFile('legacy.json', { counts: { purchase: 1 } });

    const err: string[] = [];

    const exitCode = await main(['--new-path', newPath, '--legacy-path', legacyPath], {
      out: () => undefined,
      err: (message) => err.push(message),
      loadCounts: loadCountsFromFile
    });

    expect(exitCode).toBe(1);
    expect(err[0]).toContain('Dataset format is invalid.');
  });
});
