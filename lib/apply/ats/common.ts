/**
 * The flow every ATS adapter shares: scan, answer, fill, decide, submit, prove.
 *
 * The one rule this file exists to enforce: a click on "Submit" is not an
 * application. `applied` is only returned when the site itself shows its
 * confirmation (text or URL) within the wait. A captcha, a verification-code
 * prompt, a validation error, or plain silence all end as something else, and
 * a form with any required question the engine could not honestly answer is
 * never submitted at all.
 *
 * Captchas are detected, never touched. Both reCAPTCHA (Ashby) and hCaptcha
 * (Lever) keep invisible challenge iframes in the DOM on every page load, so
 * presence means nothing; only a VISIBLE challenge counts.
 */
import fs from 'fs';
import type { Page } from 'playwright';
import type {
  Answer,
  ApplicantProfile,
  ApplyOutcome,
  AtsContext,
  FormQuestion,
} from '@/lib/apply/types';
import { ensurePageHelpers, scanForm, type FormScope, type ScanResult } from './form-scan';
import { fillAnswers, type FillResult } from './fill';

/** How long to wait for the site's confirmation after clicking submit. */
export const CONFIRM_TIMEOUT_MS = 20_000;
const POLL_MS = 400;
/** Errors are only trusted once the page has had a moment to react to the click. */
const ERROR_GRACE_MS = 1_200;

export interface AdapterOptions {
  confirmTimeoutMs?: number;
}

// ── Visibility helpers ─────────────────────────────────────────────────────

export async function anyVisible(scope: FormScope, selector: string, max = 15): Promise<boolean> {
  const loc = scope.locator(selector);
  const n = Math.min(await loc.count().catch(() => 0), max);
  for (let i = 0; i < n; i += 1) {
    if (await loc.nth(i).isVisible().catch(() => false)) return true;
  }
  return false;
}

/** First visible element under `selector` whose text matches a pattern; returns a short snippet. */
export async function visibleTextMatch(
  scope: FormScope,
  selector: string,
  patterns: RegExp[],
  max = 40
): Promise<string | null> {
  const loc = scope.locator(selector);
  const n = Math.min(await loc.count().catch(() => 0), max);
  for (let i = 0; i < n; i += 1) {
    const el = loc.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    const text = (await el.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    for (const p of patterns) {
      const m = p.exec(text);
      if (m) return m[0].slice(0, 160);
    }
  }
  return null;
}

/** Clicks the first visible match of any selector. Returns whether something was clicked. */
export async function clickFirstVisible(scope: FormScope, selectors: string[]): Promise<boolean> {
  for (const selector of selectors) {
    const loc = scope.locator(selector);
    const n = Math.min(await loc.count().catch(() => 0), 10);
    for (let i = 0; i < n; i += 1) {
      const el = loc.nth(i);
      if (!(await el.isVisible().catch(() => false))) continue;
      await el.click({ timeout: 5000 });
      return true;
    }
  }
  return false;
}

export async function settle(page: Page, maxMs = 5000): Promise<void> {
  await page.waitForLoadState('load', { timeout: maxMs }).catch(() => undefined);
  await page.waitForLoadState('networkidle', { timeout: maxMs }).catch(() => undefined);
}

// ── Captcha / verification ─────────────────────────────────────────────────

const CAPTCHA_SELECTORS: ReadonlyArray<[string, string]> = [
  ['reCAPTCHA challenge', 'iframe[src*="recaptcha"][title*="challenge" i]'],
  ['reCAPTCHA checkbox', 'iframe[src*="recaptcha"][src*="anchor"]:not([src*="size=invisible"])'],
  ['hCaptcha challenge', 'iframe[src*="hcaptcha"]'],
  ['DataDome challenge', 'iframe[src*="captcha-delivery.com"]'],
  ['Cloudflare challenge', 'iframe[src*="challenges.cloudflare.com"]'],
];

const CODE_PROMPT = /(verification|security|one[- ]time|confirmation|access)\s+code|\bOTP\b|code (was |has been )?(sent|emailed)|we (just )?(sent|emailed) (you )?a code/i;
const CODE_INPUT =
  'input[autocomplete="one-time-code"], input[name*="code" i], input[id*="code" i], input[aria-label*="code" i], input[placeholder*="code" i], input[name*="otp" i], input[id*="otp" i]';

/** Returns a short description of a visible challenge, or null. Never interacts with it. */
export async function detectCaptcha(page: Page, scope: FormScope = page): Promise<string | null> {
  const scopes: FormScope[] = scope === page ? [page] : [page, scope];
  for (const s of scopes) {
    for (const [name, selector] of CAPTCHA_SELECTORS) {
      if (await anyVisible(s, selector)) return name;
    }
  }
  for (const s of scopes) {
    const bodyText = await s
      .locator('body')
      .innerText({ timeout: 1000 })
      .catch(() => '');
    if (!CODE_PROMPT.test(bodyText)) continue;
    const inputs = s.locator(CODE_INPUT);
    const n = Math.min(await inputs.count().catch(() => 0), 10);
    for (let i = 0; i < n; i += 1) {
      const input = inputs.nth(i);
      if (!(await input.isVisible().catch(() => false))) continue;
      const hint = await input
        .evaluate((el) => `${el.getAttribute('name')} ${el.id} ${el.getAttribute('placeholder')} ${el.getAttribute('aria-label')}`)
        .catch(() => '');
      if (/postal|zip|country|dial|promo|referr|coupon/i.test(hint)) continue;
      return 'verification code prompt';
    }
  }
  return null;
}

// ── Validation errors ──────────────────────────────────────────────────────

export async function collectValidationErrors(scope: FormScope): Promise<string[]> {
  await ensurePageHelpers(scope);
  return scope
    .evaluate(() => {
      const selectors = [
        '[role="alert"]',
        '.error-message',
        '.helper-text--error',
        '.field-error',
        '.error',
        '[class*="error-message"]',
        '[class*="errorMessage"]',
        '[data-automation-id="errorMessage"]',
        '[data-automation-id="inputAlert"]',
        '[id$="-error"]',
      ].join(', ');
      const out: string[] = [];
      const seen = new Set<string>();
      const visible = (el: Element): boolean => {
        const withApi = el as Element & { checkVisibility?: (o?: object) => boolean };
        if (typeof withApi.checkVisibility === 'function' && !withApi.checkVisibility({ visibilityProperty: true })) {
          return false;
        }
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      document.querySelectorAll(selectors).forEach((el) => {
        if (!visible(el)) return;
        const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (text.length < 2 || text.length > 300 || seen.has(text)) return;
        seen.add(text);
        out.push(text);
      });
      return out.slice(0, 10);
    })
    .catch(() => [] as string[]);
}

// ── Waiting for the result of a submit ─────────────────────────────────────

export type SubmitOutcome =
  | { kind: 'confirmed'; evidence: string[] }
  | { kind: 'captcha'; detail: string }
  | { kind: 'errors'; errors: string[] }
  | { kind: 'timeout' };

export type ConfirmFn = () => Promise<string[] | null>;

export async function waitForSubmitOutcome(
  page: Page,
  scope: FormScope,
  confirm: ConfirmFn,
  timeoutMs: number,
  baselineErrors: string[] = []
): Promise<SubmitOutcome> {
  const started = Date.now();
  const baseline = new Set(baselineErrors);
  let lastErrors = '';
  while (Date.now() - started < timeoutMs) {
    const evidence = await confirm().catch(() => null);
    if (evidence && evidence.length > 0) return { kind: 'confirmed', evidence };

    const captcha = await detectCaptcha(page, scope).catch(() => null);
    if (captcha) return { kind: 'captcha', detail: captcha };

    if (Date.now() - started >= ERROR_GRACE_MS) {
      const errors = (await collectValidationErrors(scope)).filter((e) => !baseline.has(e));
      const key = errors.join('|');
      // Same errors on two consecutive polls: the page has settled on them.
      if (errors.length > 0 && key === lastErrors) return { kind: 'errors', errors };
      lastErrors = key;
    }
    await page.waitForTimeout(POLL_MS);
  }
  return { kind: 'timeout' };
}

// ── Profile answers for the standard contact fields ────────────────────────

function norm(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function profileAnswer(q: FormQuestion, value: string, what: string): Answer {
  return {
    questionId: q.id,
    label: q.label,
    value,
    source: 'profile',
    confidence: 100,
    reason: `From your profile: ${what}.`,
  };
}

/**
 * Answers name/email/phone/links/resume/location straight from the profile.
 * Only text-like fields (and the resume file): a dropdown asking "location"
 * has options the profile string may not match, so it goes to the engine.
 * Anything the profile does not hold is left for the engine too — never guessed.
 */
export function answerStandardFields(
  questions: FormQuestion[],
  profile: ApplicantProfile
): { answers: Answer[]; remaining: FormQuestion[] } {
  const answers: Answer[] = [];
  const remaining: FormQuestion[] = [];
  const nameParts = profile.fullName.trim().split(/\s+/).filter(Boolean);
  const textLike = new Set(['text', 'email', 'tel', 'url']);

  for (const q of questions) {
    const l = norm(q.label);
    let answer: Answer | null = null;

    if (q.kind === 'file') {
      if (/\b(resume|cv|curriculum vitae)\b/.test(l) && profile.resumePdfPath && fs.existsSync(profile.resumePdfPath)) {
        answer = profileAnswer(q, profile.resumePdfPath, 'resume PDF');
      }
    } else if (textLike.has(q.kind)) {
      const aboutSomeoneElse = /refer|reference|recruiter|manager|emergency|spouse|parent/.test(l);
      if (aboutSomeoneElse) {
        answer = null;
      } else if (/^(legal )?(first|given) name$|^forename$/.test(l) && nameParts.length > 0) {
        answer = profileAnswer(q, nameParts[0], 'first name');
      } else if (/^(legal )?(last|family) name$|^surname$/.test(l) && nameParts.length > 1) {
        answer = profileAnswer(q, nameParts.slice(1).join(' '), 'last name');
      } else if (/^(full |legal |your |candidate )?(full )?name$/.test(l) && profile.fullName.trim()) {
        answer = profileAnswer(q, profile.fullName.trim(), 'full name');
      } else if ((q.kind === 'email' || /\be ?mail\b/.test(l)) && profile.email) {
        answer = profileAnswer(q, profile.email, 'email');
      } else if ((q.kind === 'tel' || /\b(phone|mobile|cell)\b/.test(l)) && profile.phone) {
        answer = profileAnswer(q, profile.phone, 'phone');
      } else if (/linkedin/.test(l) && profile.linkedinUrl) {
        answer = profileAnswer(q, profile.linkedinUrl, 'LinkedIn URL');
      } else if (/github/.test(l) && profile.githubUrl) {
        answer = profileAnswer(q, profile.githubUrl, 'GitHub URL');
      } else if (/portfolio|personal (website|site)|^website( url)?$/.test(l) && profile.portfolioUrl) {
        answer = profileAnswer(q, profile.portfolioUrl, 'portfolio URL');
      } else if (/^(current )?(location|city)$|^where are you (currently )?(located|based)$/.test(l) && profile.currentLocation) {
        answer = profileAnswer(q, profile.currentLocation, 'current location');
      }
    }

    if (answer) answers.push(answer);
    else remaining.push(q);
  }
  return { answers, remaining };
}

// ── Blockers ───────────────────────────────────────────────────────────────

export interface Blocker {
  questionId: string;
  label: string;
  reason: string;
}

function isEmpty(value: Answer['value'] | undefined): boolean {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

/** Required questions that are unanswered, deliberately withheld, or failed to fill. */
export function findBlockers(questions: FormQuestion[], answers: Answer[], fill: FillResult): Blocker[] {
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  const skipped = new Map(fill.skipped.map((s) => [s.questionId, s]));
  const blockers: Blocker[] = [];
  for (const q of questions) {
    if (!q.required) continue;
    const a = byId.get(q.id);
    if (!a || isEmpty(a.value)) {
      const reason = a?.sensitive
        ? 'sensitive: left for you'
        : q.kind === 'file'
          ? 'no resume PDF available'
          : 'no honest answer available';
      blockers.push({ questionId: q.id, label: q.label || q.id, reason });
      continue;
    }
    const s = skipped.get(q.id);
    if (s) blockers.push({ questionId: q.id, label: q.label || q.id, reason: s.reason });
  }
  return blockers;
}

export function describeBlockers(blockers: Blocker[]): string {
  const list = blockers
    .slice(0, 8)
    .map((b) => `"${b.label.slice(0, 80)}" (${b.reason})`)
    .join('; ');
  const more = blockers.length > 8 ? `; and ${blockers.length - 8} more` : '';
  return `Not submitted. These required questions need you: ${list}${more}.`;
}

// ── Outcome helpers ────────────────────────────────────────────────────────

export function outcome(
  atsName: string,
  status: ApplyOutcome['status'],
  message: string,
  answers: Answer[] = [],
  evidence: string[] = []
): ApplyOutcome {
  return { status, message, answers, evidence, atsName };
}

// ── Scan → answer → fill ───────────────────────────────────────────────────

export interface PrepareSpec {
  atsName: string;
  scope: FormScope;
  rootSelector?: string | null;
  excludeSelector?: string | null;
}

export interface Prepared {
  scan: ScanResult;
  answers: Answer[];
  fill: FillResult;
  blockers: Blocker[];
}

/**
 * Scans the form, answers standard fields from the profile and the rest via
 * the answer engine, fills everything, and lists what still blocks submission.
 * Returns an outcome instead when a challenge is already on screen.
 */
export async function prepareAndFill(
  page: Page,
  ctx: AtsContext,
  spec: PrepareSpec
): Promise<{ prepared: Prepared } | { early: ApplyOutcome }> {
  const step = `ats:${spec.atsName}`;
  const pre = await detectCaptcha(page, spec.scope);
  if (pre) {
    ctx.log.warn(step, `challenge on the page before filling: ${pre}`);
    return {
      early: outcome(spec.atsName, 'captcha', `The site showed a ${pre} before the form could be filled. Open it in the browser to continue.`),
    };
  }

  const scan = await scanForm(spec.scope, {
    rootSelector: spec.rootSelector,
    excludeSelector: spec.excludeSelector,
  });
  ctx.log.info(step, `scanned ${scan.questions.length} questions`, {
    required: scan.questions.filter((q) => q.required).length,
  });

  const { answers: fromProfile, remaining } = answerStandardFields(scan.questions, ctx.profile);
  let fromEngine: Answer[] = [];
  if (remaining.length > 0) {
    const remainingIds = new Set(remaining.map((q) => q.id));
    const raw = await ctx.answers.answer(remaining, { profile: ctx.profile, job: ctx.job });
    fromEngine = raw.filter((a) => remainingIds.has(a.questionId));
  }
  const answers = [...fromProfile, ...fromEngine];

  const fill = await fillAnswers(spec.scope, scan, answers, { log: ctx.log, step });
  const blockers = findBlockers(scan.questions, answers, fill);
  return { prepared: { scan, answers, fill, blockers } };
}

// ── Submit → confirm ───────────────────────────────────────────────────────

export interface SubmitSpec {
  atsName: string;
  scope: FormScope;
  submitSelector: string;
  confirm: ConfirmFn;
  confirmTimeoutMs: number;
}

export async function submitAndConfirm(
  page: Page,
  ctx: AtsContext,
  spec: SubmitSpec,
  answers: Answer[]
): Promise<ApplyOutcome> {
  const step = `ats:${spec.atsName}`;
  const button = spec.scope.locator(spec.submitSelector).first();
  if ((await button.count()) === 0 || !(await button.isVisible().catch(() => false))) {
    ctx.log.warn(step, 'submit button not found', { selector: spec.submitSelector });
    return outcome(spec.atsName, 'needs_review', 'Filled, but the submit button was not found. Submit it yourself after checking.', answers);
  }

  const baselineErrors = await collectValidationErrors(spec.scope);
  await ctx.log.screenshot(page, `${spec.atsName}-before-submit`).catch(() => null);
  ctx.log.info(step, 'clicking submit');
  await button.click({ timeout: 5000 });

  const result = await waitForSubmitOutcome(page, spec.scope, spec.confirm, spec.confirmTimeoutMs, baselineErrors);
  switch (result.kind) {
    case 'confirmed':
      ctx.log.info(step, 'site confirmed the application', { evidence: result.evidence });
      return outcome(spec.atsName, 'applied', 'Application submitted and confirmed by the site.', answers, result.evidence);
    case 'captcha':
      ctx.log.warn(step, `challenge after submit: ${result.detail}`);
      return outcome(
        spec.atsName,
        'captcha',
        `The site asked for a ${result.detail} after submit. Finish it in the browser; it is not counted as applied.`,
        answers
      );
    case 'errors':
      ctx.log.warn(step, 'site reported validation errors', { errors: result.errors });
      return outcome(
        spec.atsName,
        'needs_review',
        `The site rejected the submission: ${result.errors.join(' | ').slice(0, 400)}`,
        answers
      );
    default:
      ctx.log.warn(step, 'no confirmation after submit', { timeoutMs: spec.confirmTimeoutMs });
      return outcome(
        spec.atsName,
        'needs_review',
        'Submitted click could not be confirmed: no confirmation or error appeared. Check the site before assuming it went through.',
        answers
      );
  }
}

/** Single-page form: prepare, stop on blockers or preview, else submit and confirm. */
export async function completeSinglePageForm(
  page: Page,
  ctx: AtsContext,
  spec: PrepareSpec & Omit<SubmitSpec, 'scope' | 'atsName'>
): Promise<ApplyOutcome> {
  const step = `ats:${spec.atsName}`;
  const res = await prepareAndFill(page, ctx, spec);
  if ('early' in res) return res.early;
  const { answers, blockers } = res.prepared;

  if (blockers.length > 0) {
    ctx.log.warn(step, 'required questions unresolved; not submitting', {
      blockers: blockers.map((b) => b.label),
    });
    return outcome(spec.atsName, 'needs_review', describeBlockers(blockers), answers);
  }
  if (!ctx.submit) {
    ctx.log.info(step, 'preview mode: stopping before submit');
    return outcome(spec.atsName, 'needs_review', 'Preview: every required field is filled; not submitted because submit is off.', answers);
  }
  return submitAndConfirm(page, ctx, { ...spec }, answers);
}
