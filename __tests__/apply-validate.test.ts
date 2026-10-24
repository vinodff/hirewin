/** Start-run request validation: what reaches the runner, and what never does. */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, test } from 'vitest';
import { parseStartRequest } from '@/lib/apply/validate';

const profile = {
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
  skills: ['Java', 'SQL'],
  resumeText: 'Priya Sharma ...',
};

const job = (n: number) => ({
  jobId: `j${n}`,
  title: 'SQL Developer',
  company: 'Acme',
  jobUrl: `https://www.naukri.com/job-listings-sql-developer-acme-${n}`,
});

const env = {} as NodeJS.ProcessEnv;

describe('parseStartRequest', () => {
  test('accepts a complete request and defaults submit to false', () => {
    const r = parseStartRequest({ targets: [job(1), job(2)], profile }, env);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.submit).toBe(false);
      expect(r.value.targets).toHaveLength(2);
    }
  });

  test('submit is true only when explicitly true', () => {
    for (const submit of ['true', 1, 'yes']) {
      const r = parseStartRequest({ targets: [job(1)], profile, submit }, env);
      expect(r.ok && r.value.submit).toBe(false);
    }
    const r = parseStartRequest({ targets: [job(1)], profile, submit: true }, env);
    expect(r.ok && r.value.submit).toBe(true);
  });

  test('rejects non-Naukri or non-https job URLs', () => {
    const r = parseStartRequest(
      { targets: [{ ...job(1), jobUrl: 'http://www.naukri.com/x' }, { ...job(2), jobUrl: 'https://169.254.169.254/' }], profile },
      env
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.details.join(' ')).toMatch(/non-https|only Naukri/);
  });

  test('an expected CTC of 0 is refused rather than sent to employers', () => {
    const r = parseStartRequest({ targets: [job(1)], profile: { ...profile, expectedCtcLpa: 0 } }, env);
    expect(r.ok).toBe(false);
  });

  test('a fresher with 0 experience and 0 current CTC is valid', () => {
    expect(parseStartRequest({ targets: [job(1)], profile }, env).ok).toBe(true);
  });

  test('drops unknown keys and bounds strings', () => {
    const r = parseStartRequest(
      { targets: [{ ...job(1), title: 'x'.repeat(1000), evil: 1 }], profile: { ...profile, isAdmin: true } },
      env
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.targets[0].title).toHaveLength(300);
      expect(r.value.targets[0]).not.toHaveProperty('evil');
      expect(r.value.profile).not.toHaveProperty('isAdmin');
    }
  });

  test('duplicate jobs, too many jobs and bad concurrency are refused', () => {
    expect(parseStartRequest({ targets: [job(1), job(1)], profile }, env).ok).toBe(false);
    expect(parseStartRequest({ targets: Array.from({ length: 26 }, (_, i) => job(i)), profile }, env).ok).toBe(false);
    expect(parseStartRequest({ targets: [job(1)], profile, concurrency: 9 }, env).ok).toBe(false);
  });

  test('invalid notice period is refused', () => {
    expect(parseStartRequest({ targets: [job(1)], profile: { ...profile, noticePeriod: '45 days' } }, env).ok).toBe(false);
  });

  test('resume PDF: configured path must exist', () => {
    const pdf = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hw-pdf-')), 'resume.pdf');
    fs.writeFileSync(pdf, '%PDF-1.4');
    const good = parseStartRequest({ targets: [job(1)], profile }, { HIREWIN_RESUME_PDF: pdf } as unknown as NodeJS.ProcessEnv);
    expect(good.ok && good.value.profile.resumePdfPath).toBe(pdf);
    const bad = parseStartRequest({ targets: [job(1)], profile: { ...profile, resumePdfPath: 'C:/nope/missing.pdf' } }, env);
    expect(bad.ok).toBe(false);
  });

  test('profile links must be real http(s) URLs', () => {
    const r = parseStartRequest(
      { targets: [job(1)], profile: { ...profile, linkedinUrl: 'javascript:alert(1)', githubUrl: 'https://github.com/priya' } },
      env
    );
    expect(r.ok && r.value.profile.linkedinUrl).toBeUndefined();
    expect(r.ok && r.value.profile.githubUrl).toBe('https://github.com/priya');
  });
});
