/**
 * External-ATS adapters against real Chromium.
 *
 * Every fixture is served at a realistic URL through context.route, so
 * detectAts, adapter.matches and the URL logic (Lever's /apply, Ashby's
 * /application, Workday's apply adventure) run exactly as they would live.
 * All other network traffic is answered with an empty 404: nothing leaves the
 * machine, and nothing is ever submitted to a real site.
 *
 * The fixtures' submit handlers POST to /__hw/submit; the route counter below
 * is how "the form was NOT submitted" is proven, not inferred.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type {
  Answer,
  AnswerEngine,
  ApplicantProfile,
  AtsAdapter,
  AtsContext,
  FormQuestion,
  JobContext,
  JobLogger,
  LogLevel,
  RunLogEntry,
} from '@/lib/apply/types';
import {
  applyOnExternalSite,
  createAshbyAdapter,
  createGreenhouseAdapter,
  createLeverAdapter,
  createSmartRecruitersAdapter,
  createWorkdayAdapter,
  detectAts,
} from '@/lib/apply/ats';
import { scanForm } from '@/lib/apply/ats/form-scan';
import { fillAnswers } from '@/lib/apply/ats/fill';

vi.setConfig({ testTimeout: 90_000, hookTimeout: 120_000 });

const FIXTURES = path.join(__dirname, 'fixtures', 'ats');
const fixture = (name: string): string => fs.readFileSync(path.join(FIXTURES, name), 'utf8');

// ── Test doubles ───────────────────────────────────────────────────────────

class MemoryLogger implements JobLogger {
  readonly list: RunLogEntry[] = [];
  readonly shots: string[] = [];
  private push(level: LogLevel, step: string, msg: string, data?: Record<string, unknown>): void {
    this.list.push({ t: Date.now(), level, step, msg, data });
  }
  info(step: string, msg: string, data?: Record<string, unknown>): void {
    this.push('info', step, msg, data);
  }
  warn(step: string, msg: string, data?: Record<string, unknown>): void {
    this.push('warn', step, msg, data);
  }
  error(step: string, msg: string, data?: Record<string, unknown>): void {
    this.push('error', step, msg, data);
  }
  async screenshot(_page: Page, label: string): Promise<string | null> {
    this.shots.push(label);
    return `${label}.png`;
  }
  entries(): RunLogEntry[] {
    return this.list;
  }
}

type Rule = [RegExp, Answer['value'], { sensitive?: boolean; confidence?: number }?];

/** First matching rule wins; anything unmatched is deliberately unanswered. */
function fakeEngine(rules: Rule[]): AnswerEngine & { asked: FormQuestion[] } {
  const asked: FormQuestion[] = [];
  return {
    asked,
    async answer(questions: FormQuestion[]): Promise<Answer[]> {
      asked.push(...questions);
      return questions.map((q) => {
        const rule = rules.find(([re]) => re.test(q.label));
        const value = rule ? rule[1] : null;
        return {
          questionId: q.id,
          label: q.label,
          value,
          source: value === null ? 'none' : 'ai',
          confidence: rule?.[2]?.confidence ?? 90,
          reason: rule ? 'fixture rule' : 'no rule',
          sensitive: rule?.[2]?.sensitive,
        };
      });
    },
  };
}

let browser: Browser;
let tmpDir: string;
let resumePath: string;
let profile: ApplicantProfile;
const job: JobContext = { title: 'Software Engineer', company: 'Acme' };

beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hirewin-ats-test-'));
  resumePath = path.join(tmpDir, 'resume.pdf');
  fs.writeFileSync(resumePath, '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
  profile = {
    fullName: 'Asha Verma',
    email: 'asha.verma@example.com',
    phone: '+919876543210',
    currentLocation: 'Bengaluru',
    totalExperienceYears: 0,
    noticePeriod: 'Immediate',
    currentCtcLpa: 0,
    expectedCtcLpa: 6,
    highestDegree: 'B.Tech / B.E.',
    specialization: 'Computer Science',
    collegeName: 'Example Institute of Technology',
    graduationYear: 2026,
    skills: ['TypeScript', 'React'],
    resumeText: '',
    resumePdfPath: resumePath,
    linkedinUrl: 'https://www.linkedin.com/in/asha-verma-example',
  };
});

afterAll(async () => {
  await browser?.close();
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

interface Site {
  context: BrowserContext;
  page: Page;
  submits: Array<Record<string, unknown>>;
}

async function openSite(pattern: string, html: string): Promise<Site> {
  const context = await browser.newContext();
  const submits: Array<Record<string, unknown>> = [];
  // Registered first = lowest priority: everything not served below is an empty 404.
  await context.route('**/*', (route) => route.fulfill({ status: 404, contentType: 'text/plain', body: '' }));
  await context.route(pattern, (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html })
      : route.fulfill({ status: 405, body: '' })
  );
  await context.route('**/__hw/submit', async (route) => {
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>;
    } catch {
      body = {};
    }
    submits.push(body);
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  const page = await context.newPage();
  return { context, page, submits };
}

function makeCtx(rules: Rule[], submit = true): { ctx: AtsContext; log: MemoryLogger } {
  const log = new MemoryLogger();
  return { ctx: { profile, job, answers: fakeEngine(rules), log, submit }, log };
}

// Short confirmation wait so "no confirmation" cases finish quickly.
const CONFIRM_MS = 3000;
const testAdapters: AtsAdapter[] = [
  createGreenhouseAdapter({ confirmTimeoutMs: CONFIRM_MS }),
  createLeverAdapter({ confirmTimeoutMs: CONFIRM_MS }),
  createAshbyAdapter({ confirmTimeoutMs: CONFIRM_MS }),
  createSmartRecruitersAdapter({ confirmTimeoutMs: CONFIRM_MS }),
  createWorkdayAdapter({ confirmTimeoutMs: CONFIRM_MS }),
];

// ── detectAts ──────────────────────────────────────────────────────────────

describe('detectAts', () => {
  const table: Array<[string, string, boolean]> = [
    ['https://boards.greenhouse.io/acme/jobs/123', 'greenhouse', true],
    ['https://job-boards.greenhouse.io/gitlab/jobs/8556658002', 'greenhouse', true],
    ['https://job-boards.eu.greenhouse.io/acme/jobs/1', 'greenhouse', true],
    ['https://careers.acme.com/open-roles?gh_jid=4567', 'greenhouse', true],
    ['https://jobs.lever.co/palantir/ac978161-6f46-4f6b-ad9e-a258e642751c', 'lever', true],
    ['https://jobs.eu.lever.co/acme/abc/apply', 'lever', true],
    ['https://jobs.ashbyhq.com/ashby/7458d4e9/application', 'ashby', true],
    ['https://jobs.smartrecruiters.com/Visa/744000149306219-engineer', 'smartrecruiters', true],
    ['https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/X_JR1', 'workday', true],
    ['https://careers-acme.icims.com/jobs/1234/job', 'icims', false],
    ['https://acme.taleo.net/careersection/2/jobdetail.ftl', 'taleo', false],
    ['https://career5.successfactors.eu/career?company=acme', 'successfactors', false],
    ['https://acme.zohorecruit.in/jobs/Careers', 'zoho', false],
    ['https://acme.darwinbox.in/ms/candidate/careers', 'darwinbox', false],
    ['https://acme.keka.com/careers/jobdetails/1', 'keka', false],
    ['https://acme.freshteam.com/jobs/abc', 'freshteam', false],
    ['https://acme.recruit.naukri.com/job/1', 'naukri-recruit', false],
    ['https://www.naukri.com/job-listings-1', 'unknown', false],
    ['https://jobs.lever.co.evil.example/acme/1', 'unknown', false],
    ['https://myworkdayjobs.com/x', 'unknown', false],
    ['https://notgreenhouse.io/acme/jobs/1', 'unknown', false],
    ['not a url', 'unknown', false],
    ['javascript:alert(1)', 'unknown', false],
  ];
  it.each(table)('%s → %s', (url, name, supported) => {
    expect(detectAts(url)).toEqual({ name, supported });
  });
});

// ── form-scan ──────────────────────────────────────────────────────────────

describe('scanForm', () => {
  it('resolves labels, required flags and options, and skips non-questions', async () => {
    const site = await openSite('https://forms.hirewin-fixture.com/**', fixture('scan-cases.html'));
    try {
      await site.page.goto('https://forms.hirewin-fixture.com/scan');
      const { questions, handles } = await scanForm(site.page, { rootSelector: '#f' });
      const byId = new Map(questions.map((q) => [q.id, q]));

      expect(questions.map((q) => q.id).sort()).toEqual(['a1', 'a10', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9']);
      expect(byId.get('a1')).toMatchObject({ label: 'Preferred first name', kind: 'text', required: true, maxLength: 40 });
      expect(byId.get('a2')).toMatchObject({ label: 'Current employer', required: true });
      expect(byId.get('a3')).toMatchObject({ label: 'Expected salary (LPA)', kind: 'number', required: true });
      expect(byId.get('a4')).toMatchObject({ label: 'Portfolio link', kind: 'url', required: false });
      expect(byId.get('a5')).toMatchObject({ label: 'Notice period in days', required: false });
      expect(byId.get('a6')).toMatchObject({
        label: 'Highest degree',
        kind: 'select',
        required: true,
        options: [
          { label: 'B.Tech / B.E.', value: 'btech' },
          { label: 'M.Tech', value: 'mtech' },
        ],
      });
      expect(byId.get('a7')).toMatchObject({
        label: 'Willing to relocate?',
        kind: 'radio',
        required: true,
        options: [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
      });
      expect(byId.get('a8')).toMatchObject({ label: 'Languages you speak', kind: 'checkbox', multiple: true, required: false });
      expect(byId.get('a8')?.options.map((o) => o.label)).toEqual(['English', 'Hindi']);
      expect(byId.get('a9')).toMatchObject({ label: 'I agree to the privacy policy', kind: 'checkbox', required: true });
      expect(byId.get('a10')).toMatchObject({ kind: 'textarea', maxLength: 500 });

      // Handles relocate the same control.
      const handle = handles.get('a7');
      expect(Object.keys(handle?.optionSelectors ?? {})).toEqual(['yes', 'no']);
      expect(await site.page.locator(handle!.optionSelectors.no).getAttribute('value')).toBe('no');
    } finally {
      await site.context.close();
    }
  });

  it('reads Greenhouse react-select options and the resume group label', async () => {
    const site = await openSite('https://job-boards.greenhouse.io/**', fixture('greenhouse.html'));
    try {
      await site.page.goto('https://job-boards.greenhouse.io/acme/jobs/4001');
      const { questions } = await scanForm(site.page, { rootSelector: 'form#application-form' });
      const byId = new Map(questions.map((q) => [q.id, q]));
      expect(byId.get('question_2')).toMatchObject({
        kind: 'combobox',
        required: true,
        label: 'Are you currently located in Bangalore?',
        options: [
          { label: 'Yes', value: 'Yes' },
          { label: 'No', value: 'No' },
        ],
      });
      expect(byId.get('resume')).toMatchObject({ kind: 'file', label: 'Resume/CV', required: true });
      expect(byId.get('first_name')).toMatchObject({ label: 'First Name', required: true, maxLength: 255 });
      expect(byId.has('hp_field')).toBe(false);
      expect(byId.has('disabled_field')).toBe(false);
      expect(questions.some((q) => q.label === 'Attach')).toBe(false);
      expect(questions).toHaveLength(9);
    } finally {
      await site.context.close();
    }
  });
});

// ── fill ───────────────────────────────────────────────────────────────────

describe('fillAnswers', () => {
  it('commits a react-select choice, uploads the resume, and refuses values outside the options', async () => {
    const site = await openSite('https://job-boards.greenhouse.io/**', fixture('greenhouse.html'));
    try {
      await site.page.goto('https://job-boards.greenhouse.io/acme/jobs/4001');
      const scan = await scanForm(site.page, { rootSelector: 'form#application-form' });
      const mk = (questionId: string, value: Answer['value']): Answer => ({
        questionId,
        label: questionId,
        value,
        source: 'ai',
        confidence: 90,
        reason: 'test',
      });
      const log = new MemoryLogger();
      const result = await fillAnswers(
        site.page,
        scan,
        [mk('question_2', 'No'), mk('resume', resumePath), mk('question_3', 'Maybe'), mk('first_name', 'Asha')],
        { log, step: 'test' }
      );

      expect(result.filled).toEqual(expect.arrayContaining(['Are you currently located in Bangalore?', 'Resume/CV', 'First Name']));
      expect(result.skipped).toEqual([
        expect.objectContaining({ questionId: 'question_3', reason: expect.stringMatching(/not one of the options/) }),
      ]);
      const shown = await site.page.locator('[data-rs="question_2"] .select__single-value').textContent();
      expect(shown).toBe('No');
      expect(await site.page.locator('[data-rs="question_3"] .select__single-value').count()).toBe(0);
      const fileName = await site.page.locator('#resume').evaluate((el) => (el as HTMLInputElement).files?.[0]?.name);
      expect(fileName).toBe('resume.pdf');
      expect(log.list.some((e) => e.level === 'warn' && /not entered/.test(e.msg))).toBe(true);
    } finally {
      await site.context.close();
    }
  });
});

// ── Per-ATS flows ──────────────────────────────────────────────────────────

interface AtsCase {
  name: string;
  url: string;
  pattern: string;
  fixture: string;
  rules: Rule[];
  /** Label of a required question; answering it with null must block submission. */
  requiredRule: RegExp;
  checkBody: (body: Record<string, unknown>) => void;
}

const cases: AtsCase[] = [
  {
    name: 'greenhouse',
    url: 'https://job-boards.greenhouse.io/acme/jobs/4001',
    pattern: 'https://job-boards.greenhouse.io/**',
    fixture: 'greenhouse.html',
    rules: [
      [/located in Bangalore/, 'Yes'],
      [/sponsorship/, 'No'],
      [/^Gender$/, null, { sensitive: true }],
    ],
    requiredRule: /located in Bangalore/,
    checkBody: (b) =>
      expect(b).toMatchObject({
        first_name: 'Asha',
        last_name: 'Verma',
        email: 'asha.verma@example.com',
        phone: '+919876543210',
        resume: ['resume.pdf'],
        question_1: 'https://www.linkedin.com/in/asha-verma-example',
        question_2: 'Yes',
        question_3: 'No',
        gender: '',
      }),
  },
  {
    name: 'lever',
    url: 'https://jobs.lever.co/acme/5ac0ffee-1111-4222-8333-444455556666',
    pattern: 'https://jobs.lever.co/**',
    fixture: 'lever.html',
    rules: [
      [/Language Skill/, ['English (ENG)', 'Hindi (HIN)']],
      [/legally authorized/, 'Yes'],
      [/university/i, 'Anna University'],
    ],
    requiredRule: /legally authorized/,
    checkBody: (b) =>
      expect(b).toMatchObject({
        name: 'Asha Verma',
        email: 'asha.verma@example.com',
        location: 'Bengaluru',
        resume: ['resume.pdf'],
        'urls[LinkedIn]': 'https://www.linkedin.com/in/asha-verma-example',
        'cards[a69a][field0]': ['English (ENG)', 'Hindi (HIN)'],
        'cards[1c71][field0]': ['Yes'],
        'cards[3da5][field0]': 'Anna University',
      }),
  },
  {
    name: 'ashby',
    url: 'https://jobs.ashbyhq.com/acme/7a1b2c3d-0000-4000-8000-000000000abc',
    pattern: 'https://jobs.ashbyhq.com/**',
    fixture: 'ashby.html',
    rules: [
      [/intend to work from/, 'Bengaluru'],
      [/sponsorship/, 'No'],
      [/built or shipped/, 'A resume analyzer for Indian freshers.'],
      [/gender/i, null, { sensitive: true }],
    ],
    requiredRule: /built or shipped/,
    checkBody: (b) => {
      expect(b).toMatchObject({
        _systemfield_name: 'Asha Verma',
        _systemfield_email: 'asha.verma@example.com',
        _systemfield_resume: ['resume.pdf'],
        '2f73c135': 'https://www.linkedin.com/in/asha-verma-example',
        location: 'Bengaluru, Karnataka, India',
        '9dbddae8': 'no',
        '5668eabe': 'A resume analyzer for Indian freshers.',
      });
      // The autofill uploader re-parses a resume and overwrites answers; it must stay untouched.
      expect(b.autofill_used).toBeUndefined();
    },
  },
  {
    name: 'smartrecruiters',
    url: 'https://jobs.smartrecruiters.com/AcmeCorp/744000000000001-software-engineer',
    pattern: 'https://jobs.smartrecruiters.com/**',
    fixture: 'smartrecruiters.html',
    rules: [[/TypeScript experience/, '0-1']],
    requiredRule: /TypeScript experience/,
    checkBody: (b) =>
      expect(b).toMatchObject({
        firstName: 'Asha',
        lastName: 'Verma',
        email: 'asha.verma@example.com',
        confirmEmail: 'asha.verma@example.com',
        phoneNumber: '+919876543210',
        resume: ['resume.pdf'],
        q_ts_years: '0-1',
        city: 'Bengaluru',
      }),
  },
  {
    name: 'workday',
    url: 'https://acme.wd1.myworkdayjobs.com/en-US/External/job/Bengaluru/Software-Engineer_R123',
    pattern: 'https://acme.wd1.myworkdayjobs.com/**',
    fixture: 'workday.html',
    rules: [
      [/hear about/i, 'LinkedIn'],
      [/relocate/, 'Yes'],
    ],
    requiredRule: /hear about/i,
    checkBody: (b) =>
      expect(b).toMatchObject({
        source: 'LinkedIn',
        legalNameSection_firstName: 'Asha',
        legalNameSection_lastName: 'Verma',
        email: 'asha.verma@example.com',
        'phone-number': '+919876543210',
        relocate: 'Yes',
      }),
  },
];

async function runCase(c: AtsCase, mode: string, rules: Rule[], submit = true) {
  const site = await openSite(c.pattern, fixture(c.fixture));
  try {
    const target = `${c.url}?mode=${mode}`;
    await site.page.goto(target);
    const { ctx, log } = makeCtx(rules, submit);
    const result = await applyOnExternalSite(site.page, target, ctx, { adapters: testAdapters });
    return { result, submits: site.submits, log };
  } finally {
    await site.context.close();
  }
}

for (const c of cases) {
  describe(`${c.name} adapter`, () => {
    it('submits and reports applied only with site confirmation', async () => {
      const { result, submits, log } = await runCase(c, 'success', c.rules);
      expect(result.status, result.message).toBe('applied');
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.atsName).toBe(c.name);
      expect(result.externalUrl).toContain(new URL(c.url).hostname);
      expect(submits).toHaveLength(1);
      c.checkBody(submits[0]);
      expect(log.shots).toEqual(expect.arrayContaining([`${c.name}-before-submit`, `${c.name}-result`]));
      expect(log.list.some((e) => e.step === `ats:${c.name}`)).toBe(true);
    });

    it('does not submit when a required question has no answer', async () => {
      const { result, submits } = await runCase(c, 'success', [[c.requiredRule, null], ...c.rules]);
      expect(result.status).toBe('needs_review');
      expect(result.message).toMatch(/Not submitted/);
      expect(submits).toHaveLength(0);
    });

    it('stops before submit in preview mode', async () => {
      const { result, submits } = await runCase(c, 'success', c.rules, false);
      expect(result.status).toBe('needs_review');
      expect(result.message).toMatch(/Preview/);
      expect(submits).toHaveLength(0);
    });

    it('reports a captcha challenge after submit as captcha', async () => {
      const { result, submits } = await runCase(c, 'captcha', c.rules);
      expect(result.status).toBe('captcha');
      expect(submits).toHaveLength(1);
    });

    it('reports site validation errors as needs_review', async () => {
      const { result, submits } = await runCase(c, 'validation', c.rules);
      expect(result.status).toBe('needs_review');
      expect(result.message).toMatch(/rejected/);
      expect(submits).toHaveLength(1);
    });

    it('never claims applied when nothing confirms the submit', async () => {
      const { result, submits } = await runCase(c, 'silent', c.rules);
      expect(result.status).toBe('needs_review');
      expect(result.message).toMatch(/could not be confirmed/);
      expect(result.evidence).toEqual([]);
      expect(submits).toHaveLength(1);
    });
  });
}

describe('workday account gate', () => {
  it('returns needs_review without creating an account or signing in', async () => {
    const c = cases.find((x) => x.name === 'workday')!;
    const { result, submits, log } = await runCase(c, 'account', c.rules);
    expect(result.status).toBe('needs_review');
    expect(result.message).toMatch(/sign(ing)? in or creating an account/i);
    expect(submits).toHaveLength(0);
    expect(log.list.some((e) => /requires sign-in/.test(e.msg))).toBe(true);
  });
});

// ── Generic / unknown sites ────────────────────────────────────────────────

describe('generic adapter', () => {
  it('fills an unknown career site and never submits', async () => {
    const site = await openSite('https://careers.acmecorp-example.com/**', fixture('generic.html'));
    try {
      const url = 'https://careers.acmecorp-example.com/jobs/42';
      await site.page.goto(url);
      const { ctx } = makeCtx([
        [/Why do you want/, 'I enjoy building accessible frontends.'],
        [/Newsletter/, 'asha.verma@example.com'],
      ]);
      const result = await applyOnExternalSite(site.page, url, ctx, { adapters: testAdapters });
      expect(result.status).toBe('needs_review');
      expect(result.atsName).toBe('generic');
      expect(result.message).toMatch(/Not submitted/);
      expect(site.submits).toHaveLength(0);
      expect(await site.page.inputValue('#fullname')).toBe('Asha Verma');
      expect(await site.page.inputValue('#mail')).toBe('asha.verma@example.com');
      expect(await site.page.inputValue('#why')).toBe('I enjoy building accessible frontends.');
      expect(await site.page.locator('#cv').evaluate((el) => (el as HTMLInputElement).files?.length)).toBe(1);
      // The newsletter box is not an application form and stays empty.
      expect(await site.page.inputValue('#nl')).toBe('');
    } finally {
      await site.context.close();
    }
  });

  it('leaves a sign-in-only page alone as external_unsupported, keeping the recognized ATS name', async () => {
    const site = await openSite('https://careers-acme.icims.com/**', fixture('generic.html'));
    try {
      const url = 'https://careers-acme.icims.com/jobs/1234/login?page=login';
      await site.page.goto(url);
      const { ctx } = makeCtx([]);
      const result = await applyOnExternalSite(site.page, url, ctx, { adapters: testAdapters });
      expect(result.status).toBe('external_unsupported');
      expect(result.atsName).toBe('icims');
      expect(result.message).toMatch(/sign in/i);
      expect(await site.page.inputValue('#u')).toBe('');
      expect(site.submits).toHaveLength(0);
    } finally {
      await site.context.close();
    }
  });
});

// ── index guarantees ───────────────────────────────────────────────────────

describe('applyOnExternalSite guarantees', () => {
  it('turns a thrown adapter error into status error, and unproven applied into needs_review', async () => {
    const site = await openSite('https://jobs.lever.co/**', fixture('lever.html'));
    try {
      const url = 'https://jobs.lever.co/acme/5ac0ffee-1111-4222-8333-444455556666';
      await site.page.goto(url);
      const throwing: AtsAdapter = {
        name: 'lever',
        matches: () => true,
        apply: async () => {
          throw new Error('boom');
        },
      };
      const liar: AtsAdapter = {
        name: 'lever',
        matches: () => true,
        apply: async () => ({ status: 'applied', message: 'trust me', answers: [], evidence: [] }),
      };
      const a = await applyOnExternalSite(site.page, url, makeCtx([]).ctx, { adapters: [throwing] });
      expect(a).toMatchObject({ status: 'error', atsName: 'lever', externalUrl: url });
      expect(a.message).toMatch(/boom/);
      const b = await applyOnExternalSite(site.page, url, makeCtx([]).ctx, { adapters: [liar] });
      expect(b.status).toBe('needs_review');
    } finally {
      await site.context.close();
    }
  });
});
