/**
 * The runner end to end, with the browser and the three appliers mocked:
 * login preflight, per-job persistence, crash isolation, the external hand-off
 * and the concurrency limit. The appliers have their own real-browser tests.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/lib/apply/browser', () => ({
  contextForRun: vi.fn(),
  beginRun: vi.fn(),
  endRun: vi.fn(),
}));
vi.mock('@/lib/apply/naukri', () => ({ applyOnNaukri: vi.fn(), checkNaukriLogin: vi.fn() }));
vi.mock('@/lib/apply/ats', () => ({ applyOnExternalSite: vi.fn() }));
vi.mock('@/lib/apply/answers', () => ({
  createAnswerEngine: vi.fn(() => ({ answer: vi.fn(async () => []) })),
}));

import { beginRun, contextForRun, endRun } from '@/lib/apply/browser';
import { applyOnNaukri, checkNaukriLogin } from '@/lib/apply/naukri';
import { applyOnExternalSite } from '@/lib/apply/ats';
import { startRun } from '@/lib/apply/runner';
import { readRun, type RunRecord } from '@/lib/apply/run-store';
import type { ApplicantProfile, ApplyOutcome, ApplyTarget } from '@/lib/apply/types';

const profile: ApplicantProfile = {
  fullName: 'Priya Sharma',
  email: 'priya@example.com',
  phone: '9876543210',
  currentLocation: 'Hyderabad',
  totalExperienceYears: 0,
  noticePeriod: 'Immediate',
  currentCtcLpa: 0,
  expectedCtcLpa: 4.5,
  highestDegree: 'B.Tech',
  specialization: 'CSE',
  collegeName: '',
  graduationYear: 2026,
  skills: ['SQL'],
  resumeText: 'Priya',
};

const targets: ApplyTarget[] = [1, 2, 3, 4, 5].map((n) => ({
  jobId: `j${n}`,
  title: `Role ${n}`,
  company: `Co ${n}`,
  jobUrl: `https://www.naukri.com/job-listings-role-${n}-10000000${n}`,
}));

const fakePage = () => ({ close: vi.fn(async () => undefined), screenshot: vi.fn(async () => Buffer.from('')) });
const fakeContext = { newPage: vi.fn(async () => fakePage()) };

async function waitForFinish(runId: string): Promise<RunRecord> {
  const deadline = Date.now() + 5_000;
  for (;;) {
    const run = readRun(runId);
    if (run?.finishedAt) return run;
    if (Date.now() > deadline) throw new Error('run did not finish');
    await new Promise((r) => setTimeout(r, 20));
  }
}

let dir: string;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hirewin-runner-test-'));
  vi.stubEnv('HIREWIN_DATA_DIR', dir);
});

afterAll(() => {
  vi.unstubAllEnvs();
  fs.rmSync(dir, { recursive: true, force: true });
});

beforeEach(() => {
  vi.mocked(contextForRun).mockReset().mockResolvedValue(fakeContext as never);
  vi.mocked(checkNaukriLogin).mockReset().mockResolvedValue({ loggedIn: true, evidence: 'cookie nauk_at present' });
  vi.mocked(applyOnNaukri).mockReset();
  vi.mocked(applyOnExternalSite).mockReset();
  vi.mocked(beginRun).mockClear();
  vi.mocked(endRun).mockClear();
});

describe('runner', () => {
  test('not signed in: every job ends requires_login, nothing is applied', async () => {
    vi.mocked(checkNaukriLogin).mockResolvedValue({ loggedIn: false, evidence: 'no nauk_at cookie' });
    const run = await waitForFinish(startRun({ targets, profile, submit: true }).runId);

    expect(applyOnNaukri).not.toHaveBeenCalled();
    expect(run.fatal).toMatch(/not signed in to Naukri \(no nauk_at cookie\)/);
    expect(run.jobs.every((j) => j.phase === 'done' && j.result?.status === 'requires_login')).toBe(true);
    expect(endRun).toHaveBeenCalledTimes(1);
  });

  test('browser cannot start: every job ends error with the reason', async () => {
    vi.mocked(contextForRun).mockRejectedValue(new Error('profile locked'));
    const run = await waitForFinish(startRun({ targets: targets.slice(0, 2), profile, submit: true }).runId);
    expect(run.fatal).toBe('profile locked');
    expect(run.jobs.map((j) => j.result?.status)).toEqual(['error', 'error']);
    expect(endRun).toHaveBeenCalledTimes(1);
  });

  test('each job gets its own outcome; a crash stays in its own job', async () => {
    vi.mocked(applyOnNaukri).mockImplementation(async (_page, ctx) => {
      if (ctx.target.jobId === 'j2') throw new Error('page crashed');
      ctx.log.info('apply-response', 'HTTP 200');
      return { status: 'applied', message: 'ok', answers: [], evidence: [`apply-workflow HTTP 200 for ${ctx.target.jobId}`] };
    });
    const run = await waitForFinish(startRun({ targets: targets.slice(0, 3), profile, submit: true }).runId);

    expect(run.jobs.map((j) => j.result?.status)).toEqual(['applied', 'error', 'applied']);
    expect(run.jobs[1].result?.message).toContain('page crashed');
    expect(run.jobs[0].result?.evidence).toEqual(['apply-workflow HTTP 200 for j1']);
    expect(run.jobs[0].logs.map((l) => l.step)).toEqual(expect.arrayContaining(['start', 'apply-response', 'result']));
    expect(run.fatal).toBeNull();
  });

  test('external hand-off passes the same submit flag and returns the ATS outcome', async () => {
    const atsOutcome: ApplyOutcome = { status: 'needs_review', message: 'filled, not submitted', answers: [], evidence: [], atsName: 'lever' };
    vi.mocked(applyOnExternalSite).mockResolvedValue(atsOutcome);
    vi.mocked(applyOnNaukri).mockImplementation(async (page, ctx) => ({
      ...(await ctx.applyExternal(page, 'https://jobs.lever.co/acme/1/apply')),
      externalUrl: 'https://jobs.lever.co/acme/1/apply',
    }));
    const run = await waitForFinish(startRun({ targets: targets.slice(0, 1), profile, submit: false }).runId);

    expect(applyOnExternalSite).toHaveBeenCalledTimes(1);
    const [, url, atsCtx] = vi.mocked(applyOnExternalSite).mock.calls[0];
    expect(url).toBe('https://jobs.lever.co/acme/1/apply');
    expect(atsCtx.submit).toBe(false);
    expect(atsCtx.job.company).toBe('Co 1');
    expect(run.jobs[0].result).toMatchObject({ status: 'needs_review', atsName: 'lever', externalUrl: 'https://jobs.lever.co/acme/1/apply' });
    expect(run.submit).toBe(false);
  });

  test('never more jobs in flight than the concurrency limit', async () => {
    let inFlight = 0;
    let peak = 0;
    vi.mocked(applyOnNaukri).mockImplementation(async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 40));
      inFlight--;
      return { status: 'applied', message: 'ok', answers: [], evidence: ['x'] };
    });
    const run = await waitForFinish(startRun({ targets, profile, submit: true, concurrency: 2 }).runId);
    expect(peak).toBe(2);
    expect(run.concurrency).toBe(2);
    expect(run.jobs.every((j) => j.result?.status === 'applied')).toBe(true);
  });
});
