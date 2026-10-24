/**
 * The runner's plumbing: the concurrency pool, the local-only gate, the run
 * store, and the logger's redaction. The applier modules have their own tests.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { runPool } from '@/lib/apply/pool';
import { localRunnerVerdict } from '@/lib/apply/local-only';
import { listRuns, readRun, screenshotPath, writeRun, type RunRecord } from '@/lib/apply/run-store';
import { runDir } from '@/lib/apply/paths';
import { FileJobLogger } from '@/lib/apply/logger';

describe('runPool', () => {
  test('never exceeds the limit and keeps input order', async () => {
    let inFlight = 0;
    let peak = 0;
    const results = await runPool([50, 10, 30, 20, 40, 5], 3, async (ms, i) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, ms));
      inFlight--;
      return i;
    });
    expect(peak).toBe(3);
    expect(results.map((r) => (r.ok ? r.value : -1))).toEqual([0, 1, 2, 3, 4, 5]);
  });

  test('one failing task does not stop the others', async () => {
    const results = await runPool([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error('boom');
      return n * 10;
    });
    expect(results[0]).toEqual({ ok: true, value: 10 });
    expect(results[1].ok).toBe(false);
    expect(results[2]).toEqual({ ok: true, value: 30 });
  });

  test('handles an empty list and a silly limit', async () => {
    expect(await runPool([], 3, async () => 1)).toEqual([]);
    expect(await runPool([1, 2], 0, async (n) => n)).toHaveLength(2);
  });
});

describe('localRunnerVerdict', () => {
  const req = (host: string, extra: Record<string, string> = {}) => ({
    url: `http://${host}/api/apply/runs`,
    headers: new Headers({ host, ...extra }),
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('allows loopback hosts in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('VERCEL', '');
    for (const host of ['localhost:3000', '127.0.0.1:3000', '[::1]:3000']) {
      expect(localRunnerVerdict(req(host)).ok).toBe(true);
    }
  });

  test('refuses on Vercel', () => {
    vi.stubEnv('VERCEL', '1');
    expect(localRunnerVerdict(req('localhost:3000')).ok).toBe(false);
  });

  test('refuses a LAN or public host', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('VERCEL', '');
    expect(localRunnerVerdict(req('192.168.1.20:3000')).ok).toBe(false);
    expect(localRunnerVerdict(req('www.hirewin.live')).ok).toBe(false);
  });

  test('refuses requests relayed from another machine', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('VERCEL', '');
    expect(localRunnerVerdict(req('localhost:3000', { 'x-forwarded-for': '1.2.3.4' })).ok).toBe(false);
    expect(localRunnerVerdict(req('localhost:3000', { 'x-forwarded-for': '203.0.113.9, 127.0.0.1' })).ok).toBe(false);
  });

  test('accepts the loopback x-forwarded-for that Next itself adds to local requests', () => {
    // Regression: the first live call to /api/apply/session was refused because
    // Next sets this header on every request, including plain localhost ones.
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('VERCEL', '');
    for (const xff of ['::1', '127.0.0.1', '::ffff:127.0.0.1']) {
      expect(localRunnerVerdict(req('localhost:3000', { 'x-forwarded-for': xff })).ok).toBe(true);
    }
  });

  test('a production build needs the explicit opt-in', () => {
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(localRunnerVerdict(req('localhost:3000')).ok).toBe(false);
    vi.stubEnv('HIREWIN_LOCAL_RUNNER', '1');
    expect(localRunnerVerdict(req('localhost:3000')).ok).toBe(true);
  });
});

describe('run store and logger', () => {
  let dir: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hirewin-apply-test-'));
    vi.stubEnv('HIREWIN_DATA_DIR', dir);
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const run = (runId: string, createdAt: number): RunRecord => ({
    runId,
    createdAt,
    finishedAt: null,
    submit: true,
    concurrency: 3,
    fatal: null,
    jobs: [],
  });

  test('writes and reads back, newest first', () => {
    writeRun(run('aaaaaaaa-0001', 1));
    writeRun(run('aaaaaaaa-0002', 2));
    expect(readRun('aaaaaaaa-0001')?.createdAt).toBe(1);
    expect(listRuns().map((r) => r.runId)).toEqual(['aaaaaaaa-0002', 'aaaaaaaa-0001']);
    expect(fs.readdirSync(runDir('aaaaaaaa-0001')).filter((f) => f.endsWith('.tmp'))).toEqual([]);
  });

  test('rejects path tricks in run ids and screenshot names', () => {
    expect(() => runDir('../../etc')).toThrow();
    expect(screenshotPath('aaaaaaaa-0001', '../run.json')).toBeNull();
    expect(screenshotPath('aaaaaaaa-0001', 'job-1-apply.png')).toContain('job-1-apply.png');
  });

  test('logger redacts secret-looking keys and truncates', () => {
    const log = new FileJobLogger('aaaaaaaa-0003', 'job1', undefined, false);
    log.info('navigate', 'x'.repeat(2000), { url: 'https://www.naukri.com/x', cookie: 'nauk_at=abc', authToken: 'zzz' });
    const [entry] = log.entries();
    expect(entry.msg.length).toBeLessThanOrEqual(1001);
    expect(entry.data).toEqual({ url: 'https://www.naukri.com/x', cookie: '[redacted]', authToken: '[redacted]' });
  });
});
