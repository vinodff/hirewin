/**
 * Answering Naukri's screening chatbot.
 *
 * When a job has recruiter questions, the first apply-workflow response carries
 * `jobs[0].questionnaire` and Naukri's page opens a chat drawer that asks them
 * one at a time. The page's own JS then re-POSTs apply-workflow with the
 * answers. This module drives that drawer; it never builds the request itself,
 * so what Naukri receives is exactly what its own client would send.
 *
 * Source of truth is the intercepted questionnaire JSON, not the drawer text:
 * the JSON has stable ids, types and option lists, while the drawer is
 * presentation. The drawer is only used to find WHICH question is on screen
 * (by matching its text to a questionnaire label) and to enter the answer.
 *
 * Two hard stops, both returning needs_review with nothing guessed:
 *   1. Before typing anything: a required question with no answer, a
 *      sensitive question left blank, or a choice answer that is not one of
 *      the options. Checking all answers up front means the drawer never holds
 *      a half-finished application that a stray click could send.
 *   2. While driving: a prompt that cannot be matched to a question, an option
 *      or input that cannot be found. A screenshot is taken; no fallback click.
 *
 * Selectors come from open-source bots and are UNVERIFIED against a logged-in
 * live page; they are collected in CHATBOT_SELECTORS so the first real run can
 * correct them in one place.
 */
import type { Page, Response } from 'playwright';
import type { Answer, ApplyOutcome, FormQuestion, NaukriApplyContext } from '../types';
import { isApplyWorkflowPost, parseApplyResponse, summarizeApplyRequest, type ParsedApplyResponse } from './signals';

export const CHATBOT_SELECTORS = {
  botMessage: 'li.botItem',
  choiceOption: [
    '.ssrc__radio-btn-container',
    '.mcc__checkbox-container',
    '.multicheckboxes-container label',
    '.chatbot_Chip',
    '[role="radio"]',
    '[role="checkbox"]',
    '[role="option"]',
  ].join(', '),
  textInput: [
    'div.textArea[contenteditable="true"]',
    '.chatbot_InputContainer [contenteditable="true"]',
    '.chatbot_InputContainer input[type="text"]',
    '.chatbot_InputContainer textarea',
  ].join(', '),
  save: ['.sendMsg', '.sendMsgbtn_container button', 'button:text-is("Save")', 'button:text-is("Send")'].join(', '),
  skip: ':is(.chatbot_Chip, button, [role="button"]):text-matches("^skip", "i")',
  close: ['.crossIcon', '.chatBot-ic-cross', '[aria-label="close" i]'].join(', '),
} as const;

export interface ChatbotOptions {
  /** Max wait for the drawer to show the next matching prompt. */
  promptTimeoutMs: number;
  /** Max wait for the final apply-workflow response after the last answer. */
  responseTimeoutMs: number;
  /** Human-like pause between actions. */
  delay: () => Promise<void>;
}

export type ChatbotResult =
  /** The page sent apply-workflow again; the caller decides what the response means. */
  | { kind: 'response'; parsed: ParsedApplyResponse; answers: Answer[]; requestEvidence: string }
  /** Stopped on purpose; nothing further was sent. */
  | { kind: 'stopped'; outcome: ApplyOutcome }
  /** Every answer entered but no apply-workflow response arrived in time. */
  | { kind: 'no_response'; answers: Answer[] };

const POLL_MS = 200;

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exactText(label: string): RegExp {
  return new RegExp(`^\\s*${escapeRegExp(label.trim())}\\s*$`, 'i');
}

/**
 * Which pending question does this bot message ask? Exact match first, then
 * containment either way with a minimum length, so a short greeting like
 * "Hi" can never be taken for a question.
 */
export function matchQuestion(botText: string, pending: FormQuestion[]): FormQuestion | null {
  const bot = normalize(botText);
  if (!bot) return null;
  const exact = pending.find((q) => normalize(q.label) === bot);
  if (exact) return exact;
  return (
    pending.find((q) => {
      const label = normalize(q.label);
      return (label.length >= 6 && bot.includes(label)) || (bot.length >= 12 && label.includes(bot));
    }) ?? null
  );
}

/** Why this answer must not be entered automatically, or null when it may be. */
export function blockerFor(q: FormQuestion, a: Answer): string | null {
  const v = a.value;
  if (v === null) {
    if (a.sensitive) return 'sensitive question left for you';
    return q.required ? 'required question has no answer' : null;
  }
  if (q.kind === 'checkbox') {
    const values = Array.isArray(v) ? v : [v];
    if (values.length === 0) return q.required ? 'required question has no answer' : null;
    const allowed = new Set(q.options.map((o) => o.value));
    return values.every((x) => allowed.has(x)) ? null : 'answer is not one of the listed options';
  }
  if (q.kind === 'radio' || q.kind === 'select') {
    const single = Array.isArray(v) ? (v.length === 1 ? v[0] : null) : v;
    if (single === null) return 'expected exactly one option';
    return q.options.some((o) => o.value === single) ? null : 'answer is not one of the listed options';
  }
  const text = Array.isArray(v) ? v.join(' ') : v;
  return text.trim() ? null : q.required ? 'required question has no answer' : null;
}

function alignAnswers(questions: FormQuestion[], raw: Answer[]): Answer[] {
  return questions.map(
    (q) =>
      raw.find((a) => a.questionId === q.id) ?? {
        questionId: q.id,
        label: q.label,
        value: null,
        source: 'none',
        confidence: 0,
        reason: 'The answer engine returned nothing for this question.',
      },
  );
}

async function closeDrawer(page: Page): Promise<void> {
  const close = page.locator(CHATBOT_SELECTORS.close).visible().first();
  if ((await close.count().catch(() => 0)) > 0) {
    await close.click({ timeout: 2_000 }).catch(() => undefined);
  }
}

async function stop(page: Page, ctx: NaukriApplyContext, answers: Answer[], message: string, evidence: string[]): Promise<ChatbotResult> {
  ctx.log.warn('chatbot', message);
  await ctx.log.screenshot(page, 'chatbot-needs-review');
  await closeDrawer(page);
  return { kind: 'stopped', outcome: { status: 'needs_review', message, answers, evidence } };
}

type PromptWait =
  | { kind: 'prompt'; question: FormQuestion; seen: number }
  | { kind: 'response' }
  | { kind: 'timeout'; lastText: string };

async function waitForPrompt(
  page: Page,
  pending: FormQuestion[],
  seen: number,
  captured: Response[],
  timeoutMs: number,
): Promise<PromptWait> {
  const deadline = Date.now() + timeoutMs;
  let lastText = '';
  for (;;) {
    // The page may skip straight to submitting (e.g. conditional questions it
    // decided not to ask); a response means stop looking for prompts.
    if (captured.length > 0) return { kind: 'response' };
    const texts = await page.locator(CHATBOT_SELECTORS.botMessage).allInnerTexts().catch(() => [] as string[]);
    for (let i = texts.length - 1; i >= seen; i--) {
      const q = matchQuestion(texts[i], pending);
      if (q) return { kind: 'prompt', question: q, seen: texts.length };
    }
    if (texts.length > 0) lastText = texts[texts.length - 1];
    if (Date.now() >= deadline) return { kind: 'timeout', lastText };
    await page.waitForTimeout(POLL_MS);
  }
}

async function clickOption(page: Page, label: string): Promise<boolean> {
  const option = page.locator(CHATBOT_SELECTORS.choiceOption).visible().filter({ hasText: exactText(label) }).last();
  if ((await option.count()) === 0) return false;
  // Prefer the <label>: clicking a container's centre can miss a small input.
  const inner = option.locator('label').first();
  await ((await inner.count()) > 0 ? inner : option).click({ timeout: 5_000 });
  return true;
}

/** Enter one answer and press Save. Returns a reason string on failure. */
async function enterAnswer(page: Page, q: FormQuestion, a: Answer, botCountBefore: number, delay: () => Promise<void>): Promise<string | null> {
  if (a.value === null) {
    const skip = page.locator(CHATBOT_SELECTORS.skip).visible().last();
    if ((await skip.count()) === 0) return `optional question "${q.label}" has no answer and the drawer offers no Skip`;
    await skip.click({ timeout: 5_000 });
    return null;
  }

  if (q.kind === 'radio' || q.kind === 'select' || q.kind === 'checkbox') {
    const values = Array.isArray(a.value) ? a.value : [a.value];
    for (const value of values) {
      const label = q.options.find((o) => o.value === value)?.label ?? value;
      if (!(await clickOption(page, label))) return `option "${label}" for "${q.label}" is not shown in the drawer`;
      await delay();
    }
  } else {
    const input = page.locator(CHATBOT_SELECTORS.textInput).visible().last();
    if ((await input.count()) === 0) return `no text input shown for "${q.label}"`;
    await input.click({ timeout: 5_000 });
    await input.fill(Array.isArray(a.value) ? a.value.join(' ') : a.value);
    await delay();
  }

  const save = page.locator(CHATBOT_SELECTORS.save).visible().last();
  if ((await save.count()) === 0) {
    // Some chip questions may advance on click alone. Only accept that if the
    // bot visibly moved on; otherwise the answer was not sent.
    const now = await page.locator(CHATBOT_SELECTORS.botMessage).count();
    return now > botCountBefore ? null : `no Save control shown after answering "${q.label}"`;
  }
  await save.click({ timeout: 5_000 });
  return null;
}

async function waitForCaptured(page: Page, captured: Response[], timeoutMs: number): Promise<Response | null> {
  const deadline = Date.now() + timeoutMs;
  while (captured.length === 0 && Date.now() < deadline) {
    await page.waitForTimeout(POLL_MS);
  }
  return captured.length > 0 ? captured[captured.length - 1] : null;
}

export async function answerNaukriChatbot(
  page: Page,
  ctx: NaukriApplyContext,
  questions: FormQuestion[],
  opts: ChatbotOptions,
): Promise<ChatbotResult> {
  const { log, target } = ctx;
  log.info('chatbot', `questionnaire with ${questions.length} question(s)`, {
    questions: questions.map((q) => ({ id: q.id, kind: q.kind, required: q.required, label: q.label.slice(0, 120) })),
  });

  let answers: Answer[];
  try {
    const raw = await ctx.answers.answer(questions, {
      profile: ctx.profile,
      job: { title: target.title, company: target.company, location: target.location, description: target.description },
    });
    answers = alignAnswers(questions, raw);
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown error';
    return stop(page, ctx, alignAnswers(questions, []), `The answer engine failed (${reason}); nothing was sent.`, [
      'chatbot: answer engine threw',
    ]);
  }

  const blockers = questions
    .map((q, i) => ({ q, reason: blockerFor(q, answers[i]) }))
    .filter((b): b is { q: FormQuestion; reason: string } => b.reason !== null);
  if (blockers.length > 0) {
    const list = blockers.map((b) => `"${b.q.label.slice(0, 80)}" (${b.reason})`).join('; ');
    return stop(page, ctx, answers, `Screening questions need you before this can be sent: ${list}.`, [
      `chatbot: stopped before answering; ${blockers.length} question(s) need a person`,
    ]);
  }

  const captured: Response[] = [];
  const onResponse = (r: Response) => {
    if (isApplyWorkflowPost(r.url(), r.request().method())) captured.push(r);
  };
  page.on('response', onResponse);

  try {
    const pending = new Map(questions.map((q, i) => [q.id, { q, a: answers[i] }]));
    let seen = 0;
    while (pending.size > 0) {
      const pendingQs = [...pending.values()].map((p) => p.q);
      const wait = await waitForPrompt(page, pendingQs, seen, captured, opts.promptTimeoutMs);
      if (wait.kind === 'response') break;
      if (wait.kind === 'timeout') {
        return stop(
          page,
          ctx,
          answers,
          `The chatbot did not show a prompt matching the remaining question(s) (${pendingQs.map((q) => `"${q.label.slice(0, 60)}"`).join(', ')}); nothing was guessed.`,
          [`chatbot: no matching prompt within ${opts.promptTimeoutMs} ms; last bot text "${wait.lastText.slice(0, 80)}"`],
        );
      }
      const entry = pending.get(wait.question.id);
      if (!entry) break;
      await opts.delay();
      const failure = await enterAnswer(page, entry.q, entry.a, wait.seen, opts.delay);
      if (failure) {
        return stop(page, ctx, answers, `Could not enter a screening answer: ${failure}.`, [`chatbot: ${failure}`]);
      }
      // Values are the applicant's data (CTC, notice...). Log where they came from, not what they are.
      log.info('chatbot', `answered "${entry.q.label.slice(0, 80)}"`, {
        questionId: entry.q.id,
        source: entry.a.source,
        confidence: entry.a.confidence,
      });
      pending.delete(entry.q.id);
      seen = wait.seen;
    }

    const response = await waitForCaptured(page, captured, opts.responseTimeoutMs);
    if (!response) {
      log.warn('apply-response', `no apply-workflow response within ${opts.responseTimeoutMs} ms after the last answer`);
      return { kind: 'no_response', answers };
    }
    const json: unknown = await response.json().catch(() => null);
    const parsed = parseApplyResponse(response.status(), json, target.jobId);
    const summary = summarizeApplyRequest(response.request().postData(), target.jobId);
    const requestEvidence = summary.hasApplyData
      ? `final request carried applyData with ${summary.answerCount} answer(s)`
      : 'final request carried no applyData';
    log.info('apply-response', parsed.kind, { httpStatus: response.status(), evidence: parsed.evidence, requestEvidence });
    return { kind: 'response', parsed, answers, requestEvidence };
  } finally {
    page.off('response', onResponse);
  }
}
