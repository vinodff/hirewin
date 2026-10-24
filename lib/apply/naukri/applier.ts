/**
 * Apply to one Naukri job in a page of the owner's signed-in Chrome profile.
 *
 * The status this returns is a claim about the real world, so each branch
 * names its proof:
 *   applied          apply-workflow answered jobs[i].status=200, or Naukri's
 *                    own "successfully applied" message / applied-state button
 *                    appeared after we clicked Apply
 *   already_applied  the job page (or the server) says so
 *   requires_login   the page renders the signed-out apply slot, or the
 *                    server answered 401/403
 *   captcha          apply-workflow answered 406
 *   needs_review     everything the engine cannot prove, including every
 *                    response shape it does not recognise
 *
 * Clicking "Apply on company site" is NOT an application (one open-source bot
 * counted it as one). It hands the external page to ctx.applyExternal, and
 * that adapter's outcome is what gets reported.
 *
 * The response listener is registered BEFORE the click, because the POST can
 * complete inside the click itself on a fast connection, and a listener added
 * afterwards would miss it and fall back to weaker DOM evidence.
 */
import type { Page } from 'playwright';
import { checkJobUrl } from '@/lib/naukri/safety';
import type { Answer, ApplyOutcome, NaukriApplyContext } from '../types';
import { answerNaukriChatbot } from './chatbot';
import { LOGIN_CONTROL_SELECTOR } from './login';
import {
  classifyJobPage,
  isApplyWorkflowPost,
  outcomeForResponse,
  parseApplyResponse,
  type ControlFact,
  type NaukriPageFacts,
  type ParsedApplyResponse,
} from './signals';

export interface NaukriApplierOptions {
  navigationTimeoutMs?: number;
  /** Wait for the job card's controls to render after DOMContentLoaded (Naukri hydrates client-side). */
  hydrationTimeoutMs?: number;
  /** Wait for the apply-workflow response after clicking Apply. */
  responseTimeoutMs?: number;
  /** Wait for each chatbot prompt. */
  promptTimeoutMs?: number;
  /** Wait for the company-site popup / navigation to reach the external URL. */
  externalTimeoutMs?: number;
  /** How long to look for a DOM success message when no response was captured. */
  domFallbackMs?: number;
  /** Random pause range between actions, [min, max] ms. */
  delayMs?: [number, number];
  /** Follow-up questionnaires accepted before giving up. */
  maxQuestionnaireRounds?: number;
}

const DEFAULTS: Required<NaukriApplierOptions> = {
  navigationTimeoutMs: 60_000,
  hydrationTimeoutMs: 15_000,
  responseTimeoutMs: 25_000,
  promptTimeoutMs: 15_000,
  externalTimeoutMs: 30_000,
  domFallbackMs: 5_000,
  delayMs: [300, 1_200],
  maxQuestionnaireRounds: 3,
};

/*
 * Selectors from open-source bots and the existing headless applier. Verified
 * only against the test fixtures, NOT a logged-in live page. Deliberately no
 * generic `button:has-text("Apply")`: that also matches "Apply on company site".
 */
export const JOB_PAGE_SELECTORS = {
  applyButton: '#apply-button, button.apply-button, button:text-is("Apply")',
  companySiteButton: '#company-site-button, button:has-text("Apply on company site"), a:has-text("Apply on company site")',
  alreadyApplied: '#already-applied, .already-applied, button:text-is("Applied")',
  googleContinue:
    '#continue-with-google-button, .continue-with-google-button, button:has-text("Continue with Google"), a:has-text("Continue with Google")',
  applyMessage: '.apply-message',
} as const;

const MARKERS = [
  JOB_PAGE_SELECTORS.applyButton,
  JOB_PAGE_SELECTORS.companySiteButton,
  JOB_PAGE_SELECTORS.alreadyApplied,
  JOB_PAGE_SELECTORS.googleContinue,
  LOGIN_CONTROL_SELECTOR,
].join(', ');

const BODY_TEXT_LIMIT = 200_000;

type Opts = Required<NaukriApplierOptions>;
type Delay = () => Promise<void>;

function makeDelay([min, max]: [number, number]): Delay {
  return async () => {
    if (max <= 0) return;
    const ms = Math.round(min + Math.random() * Math.max(0, max - min));
    await new Promise((resolve) => setTimeout(resolve, ms));
  };
}

function firstLine(err: unknown): string {
  return err instanceof Error ? err.message.split('\n')[0] : 'unknown error';
}

function isNaukriHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === 'naukri.com' || h.endsWith('.naukri.com');
}

// ── DOM facts ──────────────────────────────────────────────────────────────

async function controlFact(page: Page, selector: string): Promise<ControlFact | null> {
  const all = page.locator(selector);
  if ((await all.count()) === 0) return null;
  const visible = all.visible().first();
  if ((await visible.count()) > 0) {
    return { visible: true, text: (await visible.innerText().catch(() => '')).trim() };
  }
  return { visible: false, text: ((await all.first().textContent().catch(() => '')) ?? '').trim() };
}

async function collectFacts(page: Page): Promise<NaukriPageFacts> {
  const [title, bodyText, applyButton, companySiteButton, alreadyApplied, login, google] = await Promise.all([
    page.title().catch(() => ''),
    page.evaluate(() => (document.body ? document.body.innerText : '')).catch(() => ''),
    controlFact(page, JOB_PAGE_SELECTORS.applyButton),
    controlFact(page, JOB_PAGE_SELECTORS.companySiteButton),
    page.locator(JOB_PAGE_SELECTORS.alreadyApplied).visible().count(),
    page.locator(LOGIN_CONTROL_SELECTOR).visible().count(),
    page.locator(JOB_PAGE_SELECTORS.googleContinue).visible().count(),
  ]);
  return {
    title,
    bodyText: bodyText.slice(0, BODY_TEXT_LIMIT),
    applyButton,
    companySiteButton,
    alreadyAppliedMarker: alreadyApplied > 0,
    loginControlVisible: login > 0,
    googleContinueVisible: google > 0,
  };
}

// ── Entry point ────────────────────────────────────────────────────────────

export async function applyOnNaukri(page: Page, ctx: NaukriApplyContext, options: NaukriApplierOptions = {}): Promise<ApplyOutcome> {
  const opts: Opts = { ...DEFAULTS, ...options };
  try {
    return await run(page, ctx, opts, makeDelay(opts.delayMs));
  } catch (err) {
    const message = firstLine(err);
    ctx.log.error('error', `applier threw: ${message}`);
    await ctx.log.screenshot(page, 'error').catch(() => null);
    return { status: 'error', message: `The Naukri applier failed: ${message}`, answers: [], evidence: [`exception: ${message}`] };
  }
}

async function run(page: Page, ctx: NaukriApplyContext, opts: Opts, delay: Delay): Promise<ApplyOutcome> {
  const { log, target } = ctx;

  const verdict = checkJobUrl(target.jobUrl);
  if (!verdict.allowed) {
    log.error('navigate', `refusing job URL: ${verdict.reason}`);
    return { status: 'error', message: `Job URL rejected: ${verdict.reason}`, answers: [], evidence: [`url check: ${verdict.reason}`] };
  }

  log.info('navigate', 'opening job page', { url: target.jobUrl });
  const nav = await page.goto(target.jobUrl, { waitUntil: 'domcontentloaded', timeout: opts.navigationTimeoutMs });
  const httpStatus = nav?.status() ?? null;
  log.info('navigate', 'job page loaded', { httpStatus, finalUrl: page.url() });

  if (httpStatus === 404 || httpStatus === 410) {
    await log.screenshot(page, 'job-page');
    return { status: 'unavailable', message: 'The job page no longer exists on Naukri.', answers: [], evidence: [`job page HTTP ${httpStatus}`] };
  }
  const finalUrl = new URL(page.url());
  if (isNaukriHost(finalUrl.hostname) && /\/n?login\b/i.test(finalUrl.pathname)) {
    await log.screenshot(page, 'job-page');
    return {
      status: 'requires_login',
      message: 'Naukri redirected the job page to its login page. Log in once in the automation browser.',
      answers: [],
      evidence: [`navigation redirected to ${finalUrl.pathname}`],
    };
  }

  await page
    .locator(MARKERS)
    .first()
    .waitFor({ state: 'attached', timeout: opts.hydrationTimeoutMs })
    .catch(() => undefined);
  await delay();
  await log.screenshot(page, 'job-page');

  const cls = classifyJobPage(await collectFacts(page));
  log.info('state', cls.state, { evidence: cls.evidence });

  switch (cls.state) {
    case 'logged_out':
      return {
        status: 'requires_login',
        message: 'Naukri shows this job to a signed-out visitor. Log in once in the automation browser, then rerun.',
        answers: [],
        evidence: [cls.evidence],
      };
    case 'expired':
      return { status: 'unavailable', message: 'This job is closed or no longer available on Naukri.', answers: [], evidence: [cls.evidence] };
    case 'unknown':
      return {
        status: 'unavailable',
        message: 'No apply control was found on the job page. Open it to check.',
        answers: [],
        evidence: [cls.evidence],
      };
    case 'already_applied':
      return { status: 'already_applied', message: 'Naukri shows this job as already applied.', answers: [], evidence: [cls.evidence] };
    case 'quota':
      return { status: 'quota_exceeded', message: "Naukri's daily apply quota is used up.", answers: [], evidence: [cls.evidence] };
    case 'company_site':
      return applyViaCompanySite(page, ctx, opts, delay, cls.evidence);
    case 'easy_apply':
      if (!ctx.submit) {
        log.info('click-apply', 'submit disabled: preview only, Apply not clicked');
        return {
          status: 'needs_review',
          message: 'Preview only: this job has Naukri Apply available. Nothing was clicked.',
          answers: [],
          evidence: [cls.evidence, 'submit=false: Apply not clicked'],
        };
      }
      return easyApply(page, ctx, opts, delay, cls.evidence);
  }
}

// ── Easy apply ─────────────────────────────────────────────────────────────

async function easyApply(page: Page, ctx: NaukriApplyContext, opts: Opts, delay: Delay, stateEvidence: string): Promise<ApplyOutcome> {
  const { log, target } = ctx;
  const responseP = page
    .waitForResponse((r) => isApplyWorkflowPost(r.url(), r.request().method()), { timeout: opts.responseTimeoutMs })
    .catch(() => null);

  await delay();
  log.info('click-apply', 'clicking Apply');
  try {
    await page.locator(JOB_PAGE_SELECTORS.applyButton).visible().first().click({ timeout: 10_000 });
  } catch (err) {
    log.warn('click-apply', `Apply could not be clicked: ${firstLine(err)}`);
    await log.screenshot(page, 'click-apply-failed');
    return { status: 'needs_review', message: 'The Apply button could not be clicked.', answers: [], evidence: [stateEvidence, 'click-apply failed'] };
  }

  const response = await responseP;
  if (!response) {
    log.warn('apply-response', `no apply-workflow response within ${opts.responseTimeoutMs} ms`);
    return domFallback(page, ctx, opts, [], [stateEvidence, `no apply-workflow response within ${opts.responseTimeoutMs} ms`]);
  }

  const json: unknown = await response.json().catch(() => null);
  const parsed = parseApplyResponse(response.status(), json, target.jobId);
  log.info('apply-response', parsed.kind, { httpStatus: response.status(), evidence: parsed.evidence });
  return settle(page, ctx, opts, delay, parsed, [], [], 1);
}

/** Follow a parsed response to an outcome, running the chatbot for questionnaires. */
async function settle(
  page: Page,
  ctx: NaukriApplyContext,
  opts: Opts,
  delay: Delay,
  parsed: ParsedApplyResponse,
  answers: Answer[],
  priorEvidence: string[],
  round: number,
): Promise<ApplyOutcome> {
  const { log } = ctx;
  if (parsed.kind !== 'questionnaire' || !parsed.questions) {
    const outcome = outcomeForResponse(parsed, answers, priorEvidence);
    if (!outcome) {
      return { status: 'needs_review', message: 'Naukri returned an unreadable questionnaire.', answers, evidence: [parsed.evidence, ...priorEvidence] };
    }
    await log.screenshot(page, outcome.status === 'applied' ? 'applied' : `result-${outcome.status}`);
    return outcome;
  }

  if (round > opts.maxQuestionnaireRounds) {
    await log.screenshot(page, 'chatbot-too-many-rounds');
    return {
      status: 'needs_review',
      message: `Naukri kept asking screening questions after ${opts.maxQuestionnaireRounds} rounds; finish this one by hand.`,
      answers,
      evidence: [parsed.evidence, ...priorEvidence],
    };
  }

  const result = await answerNaukriChatbot(page, ctx, parsed.questions, {
    promptTimeoutMs: opts.promptTimeoutMs,
    responseTimeoutMs: opts.responseTimeoutMs,
    delay,
  });
  const allAnswers = [...answers, ...(result.kind === 'stopped' ? result.outcome.answers : result.answers)];
  const trail = [...priorEvidence, parsed.evidence];

  if (result.kind === 'stopped') {
    return { ...result.outcome, answers: allAnswers, evidence: [...trail, ...result.outcome.evidence] };
  }
  if (result.kind === 'no_response') {
    return domFallback(page, ctx, opts, allAnswers, [...trail, 'chatbot answered; no apply-workflow response captured']);
  }
  return settle(page, ctx, opts, delay, result.parsed, allAnswers, [...trail, result.requestEvidence], round + 1);
}

/**
 * No response was captured. Look for Naukri's own confirmation in the DOM.
 * Anything short of that is needs_review — a click is not an application.
 */
async function domFallback(page: Page, ctx: NaukriApplyContext, opts: Opts, answers: Answer[], evidence: string[]): Promise<ApplyOutcome> {
  const { log } = ctx;
  const deadline = Date.now() + opts.domFallbackMs;
  let facts = await collectFacts(page);
  for (;;) {
    const message = page.locator(JOB_PAGE_SELECTORS.applyMessage).visible().filter({ hasText: /successfully applied/i }).first();
    if ((await message.count()) > 0) {
      const text = (await message.innerText().catch(() => '')).trim().slice(0, 100);
      log.info('apply-response', 'dom success message found', { text });
      await log.screenshot(page, 'applied');
      return { status: 'applied', message: 'Applied on Naukri; Naukri showed its success message.', answers, evidence: [...evidence, `dom: apply-message "${text}"`] };
    }
    // Only the specific applied-state element, which was absent before the
    // click (the page classified as easy_apply). Not a whole-page text match:
    // "successfully applied" can already sit in a job description or the
    // recommendations sidebar, and would have turned a failed click into
    // 'applied'.
    if (facts.alreadyAppliedMarker) {
      log.info('apply-response', 'dom applied state appeared after clicking Apply');
      await log.screenshot(page, 'applied');
      return {
        status: 'applied',
        message: 'Applied on Naukri; the job now shows the applied state.',
        answers,
        evidence: [...evidence, 'dom: applied-state marker appeared after clicking Apply'],
      };
    }
    if (Date.now() >= deadline) break;
    await page.waitForTimeout(250);
    facts = await collectFacts(page);
  }

  const cls = classifyJobPage(facts);
  await log.screenshot(page, 'no-confirmation');
  if (cls.state === 'logged_out') {
    return { status: 'requires_login', message: 'Naukri asked to sign in after Apply was clicked.', answers, evidence: [...evidence, cls.evidence] };
  }
  if (cls.state === 'quota') {
    return { status: 'quota_exceeded', message: "Naukri's daily apply quota is used up.", answers, evidence: [...evidence, cls.evidence] };
  }
  return {
    status: 'needs_review',
    message: 'Apply was clicked but Naukri gave no confirmation. Check the job page before counting it.',
    answers,
    evidence: [...evidence, 'dom: no success message'],
  };
}

// ── Company site ───────────────────────────────────────────────────────────

/** Resolve with the first non-null value, or null once every promise gave null. */
function firstNonNull<T>(promises: Promise<T | null>[]): Promise<T | null> {
  return new Promise((resolve) => {
    let left = promises.length;
    for (const p of promises) {
      void p.then((v) => {
        if (v !== null) resolve(v);
        else if (--left === 0) resolve(null);
      });
    }
  });
}

/** Wait until the page has left Naukri (redirect hops included) and the URL has stopped changing. */
async function waitForExternalUrl(target: Page, timeoutMs: number): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  let last = '';
  let stableSince = 0;
  while (Date.now() < deadline) {
    const url = target.url();
    let external = false;
    try {
      const u = new URL(url);
      external = (u.protocol === 'https:' || u.protocol === 'http:') && !isNaukriHost(u.hostname);
    } catch {
      external = false;
    }
    if (external) {
      if (url !== last) {
        last = url;
        stableSince = Date.now();
        await target.waitForLoadState('domcontentloaded', { timeout: Math.max(1, deadline - Date.now()) }).catch(() => undefined);
      } else if (Date.now() - stableSince >= 750) {
        return url;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return last || null;
}

async function applyViaCompanySite(page: Page, ctx: NaukriApplyContext, opts: Opts, delay: Delay, stateEvidence: string): Promise<ApplyOutcome> {
  const { log } = ctx;

  /*
   * `page.waitForEvent('popup')`, not `context.waitForEvent('page')`: several
   * jobs run in tabs of the same context, and a context-wide listener would
   * grab another job's new tab.
   */
  const popupP = page.waitForEvent('popup', { timeout: opts.externalTimeoutMs }).catch(() => null);
  const sameTabP = page
    .waitForURL((u) => !isNaukriHost(u.hostname), { timeout: opts.externalTimeoutMs, waitUntil: 'commit' })
    .then(() => page)
    .catch(() => null);

  await delay();
  log.info('external', 'clicking Apply on company site');
  try {
    await page.locator(JOB_PAGE_SELECTORS.companySiteButton).visible().first().click({ timeout: 10_000 });
  } catch (err) {
    log.warn('external', `company-site button could not be clicked: ${firstLine(err)}`);
    return { status: 'needs_review', message: 'The "Apply on company site" button could not be clicked.', answers: [], evidence: [stateEvidence] };
  }

  const opened = await firstNonNull<Page>([popupP, sameTabP]);
  if (!opened) {
    await log.screenshot(page, 'external-not-opened');
    return {
      status: 'needs_review',
      message: 'Clicking "Apply on company site" did not open the company page.',
      answers: [],
      evidence: [stateEvidence, `external: no popup or navigation within ${opts.externalTimeoutMs} ms`],
    };
  }
  const isPopup = opened !== page;

  try {
    const externalUrl = await waitForExternalUrl(opened, opts.externalTimeoutMs);
    let external: URL | null = null;
    try {
      external = externalUrl ? new URL(externalUrl) : null;
    } catch {
      external = null;
    }
    if (!external || isNaukriHost(external.hostname) || !/^https?:$/.test(external.protocol)) {
      await log.screenshot(opened, 'external-not-settled');
      return {
        status: 'needs_review',
        message: 'The company-site link did not reach an external careers page.',
        answers: [],
        evidence: [stateEvidence, `external: ended on ${opened.url().slice(0, 200)}`],
      };
    }

    const href = external.toString();
    log.info('external', `handing off to ${external.hostname}`, { externalUrl: href, popup: isPopup });
    await log.screenshot(opened, 'external');
    try {
      const outcome = await ctx.applyExternal(opened, href);
      return {
        ...outcome,
        externalUrl: outcome.externalUrl ?? href,
        evidence: [...outcome.evidence, `naukri: company-site redirect to ${external.hostname}`],
      };
    } catch (err) {
      const message = firstLine(err);
      log.error('external', `external applier threw: ${message}`);
      return {
        status: 'error',
        message: `The external application on ${external.hostname} failed: ${message}`,
        answers: [],
        evidence: [stateEvidence, `external: adapter threw`],
        externalUrl: href,
      };
    }
  } finally {
    if (isPopup) await opened.close().catch(() => undefined);
  }
}
