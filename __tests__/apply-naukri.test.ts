/**
 * Naukri applier tests.
 *
 * Two layers:
 *   - pure unit tests of signals.ts / matching / login interpretation, which
 *     pin down every response shape we know about;
 *   - real headless Chromium runs against fixture pages served at realistic
 *     https://www.naukri.com/job-listings-... URLs through context.route, with
 *     apply-workflow mocked per test. A catch-all route aborts every other
 *     request, so no test can reach the real internet.
 *
 * The fixtures approximate Naukri's markup and are unverified against a
 * logged-in live page; these tests prove the applier's decisions, not the
 * selectors' accuracy on the live site.
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { applyOnNaukri, checkNaukriLogin, type NaukriApplierOptions } from '@/lib/apply/naukri';
import { blockerFor, matchQuestion } from '@/lib/apply/naukri/chatbot';
import { interpretLoginSignals } from '@/lib/apply/naukri/login';
import {
  classifyJobPage,
  mapQuestionnaireItem,
  normalizeAnswerOptions,
  parseApplyResponse,
  summarizeApplyRequest,
  type NaukriPageFacts,
} from '@/lib/apply/naukri/signals';
import type {
  Answer,
  AnswerEngine,
  ApplicantProfile,
  ApplyOutcome,
  ApplyTarget,
  FormQuestion,
  JobLogger,
  NaukriApplyContext,
  RunLogEntry,
} from '@/lib/apply/types';

// ── Shared test data ───────────────────────────────────────────────────────

const JOB_ID = '120626505274';
const JOB_URL = `https://www.naukri.com/job-listings-software-engineer-acme-bengaluru-0-to-1-years-${JOB_ID}`;
const FIXTURES = path.join(__dirname, 'fixtures', 'naukri');

const PROFILE: ApplicantProfile = {
  fullName: 'Test Candidate',
  email: 'candidate@example.com',
  phone: '9876543210',
  currentLocation: 'Bengaluru',
  totalExperienceYears: 1,
  noticePeriod: 'Immediate',
  currentCtcLpa: 0,
  expectedCtcLpa: 6,
  highestDegree: 'B.Tech / B.E.',
  specialization: 'Computer Science',
  collegeName: 'Example Institute',
  graduationYear: 2025,
  skills: ['React', 'TypeScript'],
  resumeText: 'React developer',
};

const TARGET: ApplyTarget = { jobId: JOB_ID, title: 'Software Engineer', company: 'Acme', jobUrl: JOB_URL };

const FAST: NaukriApplierOptions = {
  delayMs: [0, 0],
  hydrationTimeoutMs: 3_000,
  responseTimeoutMs: 5_000,
  promptTimeoutMs: 5_000,
  externalTimeoutMs: 5_000,
  domFallbackMs: 500,
};

class MemoryLogger implements JobLogger {
  private readonly items: RunLogEntry[] = [];
  readonly shots: string[] = [];
  private push(level: RunLogEntry['level'], step: string, msg: string, data?: Record<string, unknown>) {
    this.items.push({ t: Date.now(), level, step, msg, data });
  }
  info(step: string, msg: string, data?: Record<string, unknown>) {
    this.push('info', step, msg, data);
  }
  warn(step: string, msg: string, data?: Record<string, unknown>) {
    this.push('warn', step, msg, data);
  }
  error(step: string, msg: string, data?: Record<string, unknown>) {
    this.push('error', step, msg, data);
  }
  async screenshot(_page: Page, label: string) {
    this.shots.push(label);
    return `${label}.png`;
  }
  entries() {
    return [...this.items];
  }
  steps() {
    return this.items.map((e) => e.step);
  }
}

/** Answers by question id; ids listed in `sensitive` are marked sensitive. */
function fakeEngine(values: Record<string, string | string[] | null>, sensitive: string[] = []): AnswerEngine & { calls: FormQuestion[][] } {
  const calls: FormQuestion[][] = [];
  return {
    calls,
    async answer(questions: FormQuestion[]): Promise<Answer[]> {
      calls.push(questions);
      return questions.map((q) => ({
        questionId: q.id,
        label: q.label,
        value: q.id in values ? values[q.id] : null,
        source: q.id in values && values[q.id] !== null ? 'profile' : 'none',
        confidence: 100,
        reason: 'test',
        sensitive: sensitive.includes(q.id) || undefined,
      }));
    },
  };
}

// ── Pure: response parsing ─────────────────────────────────────────────────

describe('parseApplyResponse', () => {
  it('reads jobs[0].status=200 as applied, with quota detail in evidence', () => {
    const r = parseApplyResponse(200, { jobs: [{ jobId: JOB_ID, status: 200 }], quotaDetails: { dailyApplied: 12, totalDailyQuota: 50 } }, JOB_ID);
    expect(r.kind).toBe('applied');
    expect(r.evidence).toContain('apply-workflow HTTP 200, jobs[0].status=200');
    expect(r.evidence).toContain('quotaDetails.dailyApplied=12/50');
  });

  it('picks the entry for this job id when several jobs are returned', () => {
    const r = parseApplyResponse(200, { jobs: [{ jobId: '1', status: 400 }, { jobId: JOB_ID, status: 200 }] }, JOB_ID);
    expect(r.kind).toBe('applied');
    expect(r.evidence).toContain('jobs[1].status=200');
  });

  it.each([401, 403])('HTTP %i is an invalid session', (status) => {
    expect(parseApplyResponse(status, { message: 'unauthorized' }).kind).toBe('session_invalid');
  });

  it('HTTP 406 is a captcha', () => {
    expect(parseApplyResponse(406, null).kind).toBe('captcha');
  });

  it('a 200 without jobs is NOT assumed to be already applied', () => {
    expect(parseApplyResponse(200, {}).kind).toBe('unexpected');
    expect(parseApplyResponse(200, { message: 'You have already applied to this job' }).kind).toBe('already_applied');
  });

  it('recognises quota by message and by quotaDetails', () => {
    expect(parseApplyResponse(200, { message: 'Your daily quota has been expired.' }).kind).toBe('quota');
    expect(parseApplyResponse(400, { message: 'Daily quota exceeded' }).kind).toBe('quota');
    expect(parseApplyResponse(200, { jobs: [{ status: 403 }], quotaDetails: { dailyApplied: 50, totalDailyQuota: 50 } }).kind).toBe('quota');
  });

  it('non-object bodies and unknown job statuses are unexpected', () => {
    expect(parseApplyResponse(200, 'ok').kind).toBe('unexpected');
    expect(parseApplyResponse(500, { error: 'boom' }).kind).toBe('unexpected');
    expect(parseApplyResponse(200, { jobs: [{ status: 302 }] }).kind).toBe('unexpected');
  });

  it('a questionnaire wins over status=200 and maps both answerOption shapes', () => {
    const r = parseApplyResponse(200, {
      jobs: [
        {
          jobId: JOB_ID,
          status: 200,
          questionnaire: [
            { questionId: 11, questionName: 'Years of React experience?', questionType: 'Text Box', answerOption: { '1': '', '2': '' } },
            { questionId: 12, questionName: 'Willing to relocate?', questionType: 'Radio Button', answerOption: { '1': 'Yes', '2': 'No' } },
            { questionId: 13, questionName: 'Tools used?', questionType: 'Check Box', answerOption: [{ id: 'a', label: 'Git' }, 'Docker'] },
            { questionId: 14, questionName: 'Notice period?', questionType: 'List Menu', answerOption: ['Immediate', '30 Days'], isMandatory: false },
          ],
        },
      ],
    }, JOB_ID);
    expect(r.kind).toBe('questionnaire');
    const [text, radio, check, list] = r.questions ?? [];
    expect(text).toMatchObject({ id: '11', kind: 'text', options: [], required: true });
    expect(radio).toMatchObject({ id: '12', kind: 'radio', options: [{ label: 'Yes', value: '1' }, { label: 'No', value: '2' }] });
    expect(check).toMatchObject({ kind: 'checkbox', multiple: true, options: [{ label: 'Git', value: 'a' }, { label: 'Docker', value: 'Docker' }] });
    expect(list).toMatchObject({ kind: 'select', required: false, options: [{ label: 'Immediate', value: 'Immediate' }, { label: '30 Days', value: '30 Days' }] });
  });
});

describe('questionnaire mapping helpers', () => {
  it('normalizeAnswerOptions drops empty labels and handles both shapes', () => {
    expect(normalizeAnswerOptions({ '0': '', '1': '' })).toEqual([]);
    expect(normalizeAnswerOptions({ x: 'Yes' })).toEqual([{ label: 'Yes', value: 'x' }]);
    expect(normalizeAnswerOptions(['A', { value: 'b', name: 'B' }])).toEqual([
      { label: 'A', value: 'A' },
      { label: 'B', value: 'b' },
    ]);
    expect(normalizeAnswerOptions(undefined)).toEqual([]);
  });

  it('mapQuestionnaireItem rejects items without a question name', () => {
    expect(mapQuestionnaireItem({ questionId: 1 }, 0)).toBeNull();
    expect(mapQuestionnaireItem('nope', 0)).toBeNull();
  });

  it('summarizeApplyRequest reports counts, never values', () => {
    const body = JSON.stringify({ strJobsarr: [JOB_ID], applyData: { [JOB_ID]: { answers: { '1': '6 LPA', '2': ['Yes'] } } } });
    expect(summarizeApplyRequest(body, JOB_ID)).toEqual({ hasApplyData: true, answerCount: 2 });
    expect(summarizeApplyRequest(JSON.stringify({ strJobsarr: [JOB_ID] }), JOB_ID)).toEqual({ hasApplyData: false, answerCount: 0 });
    expect(summarizeApplyRequest('not json', JOB_ID).hasApplyData).toBe(false);
  });
});

// ── Pure: page classification ──────────────────────────────────────────────

describe('classifyJobPage', () => {
  const base: NaukriPageFacts = {
    title: 'Software Engineer - Naukri.com',
    bodyText: 'Software Engineer Acme',
    applyButton: null,
    companySiteButton: null,
    alreadyAppliedMarker: false,
    loginControlVisible: false,
    googleContinueVisible: false,
  };

  it('logged-out: Continue with Google, even with a hidden apply button', () => {
    const r = classifyJobPage({ ...base, googleContinueVisible: true, loginControlVisible: true, applyButton: { visible: false, text: '' } });
    expect(r.state).toBe('logged_out');
  });

  it('easy apply, company site, already applied, expired, quota, unknown', () => {
    expect(classifyJobPage({ ...base, applyButton: { visible: true, text: 'Apply' } }).state).toBe('easy_apply');
    expect(classifyJobPage({ ...base, companySiteButton: { visible: true, text: 'Apply on company site' } }).state).toBe('company_site');
    expect(classifyJobPage({ ...base, alreadyAppliedMarker: true }).state).toBe('already_applied');
    expect(classifyJobPage({ ...base, bodyText: 'This job is no longer available' }).state).toBe('expired');
    expect(classifyJobPage({ ...base, bodyText: 'Your daily quota has been expired.', applyButton: { visible: true, text: 'Apply' } }).state).toBe('quota');
    expect(classifyJobPage(base).state).toBe('unknown');
  });
});

// ── Pure: chatbot matching / blockers, login interpretation ────────────────

describe('chatbot decisions', () => {
  const qs: FormQuestion[] = [
    { id: '1', label: 'Are you willing to relocate to Bengaluru?', kind: 'radio', options: [{ label: 'Yes', value: '1' }, { label: 'No', value: '2' }], required: true },
    { id: '2', label: 'What is your expected CTC?', kind: 'text', options: [], required: true },
  ];

  it('matches a bot prompt to its question, never a greeting', () => {
    expect(matchQuestion('Are you willing to relocate to Bengaluru ?', qs)?.id).toBe('1');
    expect(matchQuestion('Q2. What is your expected CTC? (in LPA)', qs)?.id).toBe('2');
    expect(matchQuestion('Hi', qs)).toBeNull();
  });

  it('blocks null required, sensitive null and off-list choices', () => {
    const a = (value: Answer['value'], sensitive?: boolean): Answer => ({ questionId: '1', label: '', value, source: 'ai', confidence: 90, reason: '', sensitive });
    expect(blockerFor(qs[0], a(null))).toMatch(/required/);
    expect(blockerFor({ ...qs[0], required: false }, a(null, true))).toMatch(/sensitive/);
    expect(blockerFor(qs[0], a('Maybe'))).toMatch(/not one of/);
    expect(blockerFor(qs[0], a('1'))).toBeNull();
    expect(blockerFor(qs[1], a('   '))).toMatch(/required/);
  });
});

describe('interpretLoginSignals', () => {
  it('redirect to /nlogin/ means logged out even with a cookie', () => {
    const r = interpretLoginSignals(['nauk_at', 'nauk_rt'], { url: 'https://www.naukri.com/nlogin/login?URL=x', loginControlVisible: false, signedInMarkerVisible: false, accessDenied: false });
    expect(r.loggedIn).toBe(false);
    expect(r.evidence).toContain('redirected');
  });

  const HOME = 'https://www.naukri.com/mnjuser/homepage';

  it('mnjuser page with the signed-in header is logged in; cookie-only check uses the cookie', () => {
    expect(interpretLoginSignals(['nauk_at'], { url: HOME, loginControlVisible: false, signedInMarkerVisible: true, accessDenied: false }).loggedIn).toBe(true);
    expect(interpretLoginSignals(['nauk_at'], null).loggedIn).toBe(true);
    expect(interpretLoginSignals(['_ga'], null).loggedIn).toBe(false);
  });

  it('no Login button is not proof: no signed-in header means not logged in', () => {
    // Regression: a brand-new profile with zero Naukri cookies was reported
    // loggedIn:true live, because the page showed no Login button.
    const r = interpretLoginSignals([], { url: HOME, loginControlVisible: false, signedInMarkerVisible: false, accessDenied: false });
    expect(r.loggedIn).toBe(false);
    expect(r.evidence).toMatch(/no signed-in header/);
  });

  it('Access Denied (HTTP 403) is reported as a block, never as logged in', () => {
    // Seen live: headless Chrome gets 403 "Access Denied" on every Naukri page.
    const r = interpretLoginSignals(['nauk_at'], { url: HOME, loginControlVisible: false, signedInMarkerVisible: false, accessDenied: true });
    expect(r.loggedIn).toBe(false);
    expect(r.evidence).toMatch(/HTTP 403 Access Denied/);
  });
});

// ── Browser tests ──────────────────────────────────────────────────────────

type Reply = { status: number; json?: unknown } | 'hang';

interface Harness {
  context: BrowserContext;
  page: Page;
  posts: Array<Record<string, unknown>>;
  log: MemoryLogger;
  external: Array<{ url: string; pageUrl: string }>;
}

let browser: Browser;
const open: Harness[] = [];

beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
}, 60_000);

afterEach(async () => {
  while (open.length > 0) await open.pop()?.context.close().catch(() => undefined);
});

afterAll(async () => {
  await browser?.close();
});

function fixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, name), 'utf8');
}

async function harness(jobFixture: string, reply: (body: Record<string, unknown>, n: number) => Reply = () => ({ status: 500 })): Promise<Harness> {
  const context = await browser.newContext();
  const posts: Array<Record<string, unknown>> = [];
  // Registered first = lowest precedence: anything not routed below is aborted.
  await context.route('**/*', (route) => route.abort());
  await context.route('https://www.naukri.com/job-listings-**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: fixture(jobFixture) }),
  );
  await context.route('https://www.naukri.com/mnjuser/homepage', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: fixture(jobFixture) }),
  );
  await context.route('**/apply-workflow/**', async (route) => {
    if (route.request().method() !== 'POST') return route.abort();
    const body = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>;
    posts.push(body);
    const r = reply(body, posts.length);
    if (r === 'hang') return; // never answered: simulates a response that does not arrive
    await route.fulfill({ status: r.status, contentType: 'application/json', body: JSON.stringify(r.json ?? {}) });
  });
  await context.route('https://jobs.lever.co/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><html><head><title>Acme - Backend Engineer</title></head><body><h2>Apply for this job</h2></body></html>',
    }),
  );
  const page = await context.newPage();
  const h: Harness = { context, page, posts, log: new MemoryLogger(), external: [] };
  open.push(h);
  return h;
}

function ctxFor(h: Harness, overrides: Partial<NaukriApplyContext> = {}): NaukriApplyContext {
  return {
    profile: PROFILE,
    target: TARGET,
    answers: fakeEngine({}),
    log: h.log,
    submit: true,
    applyExternal: async (page: Page, url: string): Promise<ApplyOutcome> => {
      h.external.push({ url, pageUrl: page.url() });
      return { status: 'applied', message: 'Lever confirmed', answers: [], evidence: ['lever: confirmation page'], atsName: 'lever' };
    },
    ...overrides,
  };
}

const QUESTIONNAIRE = [
  { questionId: '101', questionName: 'How many years of experience do you have in React?', questionType: 'Text Box', answerOption: {} },
  { questionId: '102', questionName: 'Are you willing to relocate to Bengaluru?', questionType: 'Radio Button', answerOption: { '1': 'Yes', '2': 'No' } },
  {
    questionId: '103',
    questionName: 'Which of these tools have you used?',
    questionType: 'Check Box',
    answerOption: [{ id: 'a', label: 'Git' }, { id: 'b', label: 'Docker' }, { id: 'c', label: 'Kubernetes' }],
  },
];

describe('applyOnNaukri in a real browser', { timeout: 45_000 }, () => {
  it('logged-out job page → requires_login, and no apply POST is sent', async () => {
    const h = await harness('job-logged-out.html', () => ({ status: 200, json: { jobs: [{ status: 200 }] } }));
    const out = await applyOnNaukri(h.page, ctxFor(h), FAST);
    expect(out.status).toBe('requires_login');
    expect(out.evidence.join(' ')).toMatch(/Continue with Google/);
    expect(h.posts).toHaveLength(0);
    expect(h.log.steps()).toEqual(expect.arrayContaining(['navigate', 'state']));
  });

  it('easy apply with HTTP 200 and jobs[0].status=200 → applied with evidence', async () => {
    const h = await harness('job-easy-apply.html', () => ({
      status: 200,
      json: { jobs: [{ jobId: JOB_ID, status: 200 }], quotaDetails: { dailyApplied: 4, totalDailyQuota: 50 } },
    }));
    const out = await applyOnNaukri(h.page, ctxFor(h), FAST);
    expect(out.status).toBe('applied');
    expect(out.evidence.join(' | ')).toContain('apply-workflow HTTP 200, jobs[0].status=200');
    expect(h.posts).toHaveLength(1);
    expect(h.posts[0].strJobsarr).toEqual([JOB_ID]);
    expect(h.log.steps()).toEqual(expect.arrayContaining(['navigate', 'state', 'click-apply', 'apply-response']));
  });

  it('submit=false → needs_review and nothing is clicked or posted', async () => {
    const h = await harness('job-easy-apply.html', () => ({ status: 200, json: { jobs: [{ status: 200 }] } }));
    const out = await applyOnNaukri(h.page, ctxFor(h, { submit: false }), FAST);
    expect(out.status).toBe('needs_review');
    expect(h.posts).toHaveLength(0);
  });

  it('HTTP 406 → captcha', async () => {
    const h = await harness('job-easy-apply.html', () => ({ status: 406, json: { message: 'recaptcha required' } }));
    const out = await applyOnNaukri(h.page, ctxFor(h), FAST);
    expect(out.status).toBe('captcha');
    expect(out.evidence.join(' ')).toContain('HTTP 406');
  });

  it('HTTP 403 → requires_login', async () => {
    const h = await harness('job-easy-apply.html', () => ({ status: 403, json: {} }));
    const out = await applyOnNaukri(h.page, ctxFor(h), FAST);
    expect(out.status).toBe('requires_login');
  });

  it('quota message in the response → quota_exceeded', async () => {
    const h = await harness('job-easy-apply.html', () => ({ status: 200, json: { message: 'Your daily quota has been expired.' } }));
    const out = await applyOnNaukri(h.page, ctxFor(h), FAST);
    expect(out.status).toBe('quota_exceeded');
  });

  it('questionnaire answered in the chatbot → second POST carries the answers → applied', async () => {
    const h = await harness('job-easy-apply.html', (body) =>
      body.applyData
        ? { status: 200, json: { jobs: [{ jobId: JOB_ID, status: 200 }] } }
        : { status: 200, json: { jobs: [{ jobId: JOB_ID, questionnaire: QUESTIONNAIRE }] } },
    );
    const engine = fakeEngine({ '101': '1', '102': '1', '103': ['a', 'b'] });
    const out = await applyOnNaukri(h.page, ctxFor(h, { answers: engine }), FAST);

    expect(out.status).toBe('applied');
    expect(h.posts).toHaveLength(2);
    expect(h.posts[1].applyData).toEqual({ [JOB_ID]: { answers: { '101': '1', '102': ['Yes'], '103': ['Git', 'Docker'] } } });
    expect(out.evidence.join(' | ')).toContain('final request carried applyData with 3 answer(s)');
    expect(out.answers.map((a) => a.questionId)).toEqual(['101', '102', '103']);
    expect(engine.calls[0].map((q) => q.kind)).toEqual(['text', 'radio', 'checkbox']);
    expect(h.log.steps()).toContain('chatbot');
    // Answer values are applicant data; the log records sources, not values.
    expect(JSON.stringify(h.log.entries())).not.toContain('Docker');
  });

  it('unanswerable required (sensitive) question → needs_review, no final POST', async () => {
    const questionnaire = [
      ...QUESTIONNAIRE.slice(0, 1),
      { questionId: '201', questionName: 'What is your gender?', questionType: 'Radio Button', answerOption: { '1': 'Male', '2': 'Female' } },
    ];
    const h = await harness('job-easy-apply.html', (body) =>
      body.applyData
        ? { status: 200, json: { jobs: [{ status: 200 }] } }
        : { status: 200, json: { jobs: [{ jobId: JOB_ID, questionnaire }] } },
    );
    const out = await applyOnNaukri(h.page, ctxFor(h, { answers: fakeEngine({ '101': '1', '201': null }, ['201']) }), FAST);

    expect(out.status).toBe('needs_review');
    expect(out.message).toContain('What is your gender?');
    expect(h.posts).toHaveLength(1);
    expect(h.posts.some((p) => 'applyData' in p)).toBe(false);
    expect(h.log.shots).toContain('chatbot-needs-review');
  });

  it('company site (popup) → applyExternal gets the Lever URL; its outcome is returned with externalUrl', async () => {
    const h = await harness('job-company-site.html');
    const out = await applyOnNaukri(h.page, ctxFor(h), FAST);
    expect(h.external).toHaveLength(1);
    expect(h.external[0].url).toBe('https://jobs.lever.co/acme/5f1c2b7e-apply/apply');
    expect(h.external[0].pageUrl).toBe(h.external[0].url);
    expect(out).toMatchObject({ status: 'applied', atsName: 'lever', externalUrl: 'https://jobs.lever.co/acme/5f1c2b7e-apply/apply' });
    expect(out.evidence).toContain('lever: confirmation page');
    expect(h.posts).toHaveLength(0);
    expect(h.context.pages()).toHaveLength(1); // popup closed afterwards
    expect(h.log.steps()).toContain('external');
  });

  it('company site (same-tab navigation) → applyExternal is called on the job page itself', async () => {
    const h = await harness('job-company-site.html');
    const out = await applyOnNaukri(h.page, ctxFor(h, { target: { ...TARGET, jobUrl: `${JOB_URL}?sametab=1` } }), FAST);
    expect(out.externalUrl).toBe('https://jobs.lever.co/acme/5f1c2b7e-apply/apply');
    expect(h.external[0].pageUrl).toContain('jobs.lever.co');
  });

  it('no apply-workflow response and no DOM success → needs_review, never applied', async () => {
    const h = await harness('job-easy-apply.html', () => 'hang');
    const out = await applyOnNaukri(h.page, ctxFor(h), { ...FAST, responseTimeoutMs: 1_500 });
    expect(out.status).toBe('needs_review');
    expect(out.evidence.join(' ')).toMatch(/no apply-workflow response/);
    expect(h.posts).toHaveLength(1);
  });

  it('"successfully applied" already in the description + no response → needs_review, not applied', async () => {
    // The DOM fallback once matched that phrase anywhere on the page, so a
    // click that Naukri never answered could be reported as an application.
    const h = await harness('job-easy-apply-success-words.html', () => 'hang');
    const out = await applyOnNaukri(h.page, ctxFor(h), { ...FAST, responseTimeoutMs: 1_500 });
    expect(out.status).toBe('needs_review');
    expect(h.posts).toHaveLength(1);
  });

  it('already-applied page → already_applied', async () => {
    const h = await harness('job-already-applied.html');
    const out = await applyOnNaukri(h.page, ctxFor(h), FAST);
    expect(out.status).toBe('already_applied');
    expect(h.posts).toHaveLength(0);
  });

  it('expired page → unavailable', async () => {
    const h = await harness('job-expired.html');
    const out = await applyOnNaukri(h.page, ctxFor(h), { ...FAST, hydrationTimeoutMs: 500 });
    expect(out.status).toBe('unavailable');
  });

  it('rejects a non-Naukri job URL without navigating', async () => {
    const h = await harness('job-easy-apply.html');
    const out = await applyOnNaukri(h.page, ctxFor(h, { target: { ...TARGET, jobUrl: 'http://169.254.169.254/latest' } }), FAST);
    expect(out.status).toBe('error');
    expect(h.page.url()).toBe('about:blank');
  });
});

describe('checkNaukriLogin in a real browser', { timeout: 30_000 }, () => {
  it('signed-in homepage + nauk_at cookie → loggedIn, evidence has names only', async () => {
    const h = await harness('homepage-logged-in.html');
    await h.context.addCookies([{ name: 'nauk_at', value: 'secret-token-value', domain: '.naukri.com', path: '/' }]);
    const r = await checkNaukriLogin(h.page, { settleTimeoutMs: 2_000 });
    expect(r.loggedIn).toBe(true);
    expect(r.evidence).toContain('nauk_at');
    expect(r.evidence).not.toContain('secret-token-value');
  });

  it('public header with Login/Register and no cookie → not logged in', async () => {
    const h = await harness('homepage-logged-out.html');
    const r = await checkNaukriLogin(h.page, { settleTimeoutMs: 2_000 });
    expect(r.loggedIn).toBe(false);
    expect(r.evidence).toMatch(/Login\/Register/);
  });
});
