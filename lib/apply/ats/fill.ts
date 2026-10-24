/**
 * Puts answers into a live form, one control at a time, and reports honestly
 * what went in and what did not.
 *
 * Every write is verified after the fact. React-controlled inputs (Greenhouse,
 * Ashby) ignore a value that did not arrive through real input events, and a
 * react-select only commits when an option is clicked — typing the text alone
 * leaves the field empty on submit. So "filled" means the page shows the value
 * afterwards, not that a call returned.
 *
 * A choice answer must be one of the options the scan saw. An answer that is
 * not is refused and logged rather than typed in as free text: an invented
 * option is exactly the kind of false statement the engine must never make.
 *
 * Combobox commit check adapted from averatec0773/offeros, Apache-2.0
 * (select-commit.ts: the rendered single-value may be the option label or the
 * wanted value).
 */
import fs from 'fs';
import type { Locator } from 'playwright';
import type { Answer, FormQuestion, JobLogger } from '@/lib/apply/types';
import { ensurePageHelpers, type FieldHandle, type FormScope, type ScanResult } from './form-scan';

export interface FillSkip {
  questionId: string;
  label: string;
  reason: string;
}

export interface FillResult {
  /** Labels of questions whose value is now visible on the page. */
  filled: string[];
  skipped: FillSkip[];
}

export interface FillOptions {
  log: JobLogger;
  /** Log step name, e.g. 'ats:lever'. */
  step?: string;
}

const TEXT_KINDS = new Set(['text', 'textarea', 'number', 'email', 'tel', 'url', 'date']);
const OPTION_WAIT_MS = 1500;

type Attempt = { ok: true } | { ok: false; reason: string };

export async function fillAnswers(
  scope: FormScope,
  scan: ScanResult,
  answers: Answer[],
  opts: FillOptions
): Promise<FillResult> {
  await ensurePageHelpers(scope);
  const step = opts.step ?? 'fill';
  const byId = new Map(scan.questions.map((q) => [q.id, q]));
  const result: FillResult = { filled: [], skipped: [] };

  for (const answer of answers) {
    const question = byId.get(answer.questionId);
    const handle = scan.handles.get(answer.questionId);
    if (!question || !handle) {
      opts.log.warn(step, 'answer for a question not on this form was ignored', {
        questionId: answer.questionId,
      });
      continue;
    }
    const value = answer.value;
    if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
      result.skipped.push({
        questionId: question.id,
        label: question.label,
        reason: answer.sensitive ? 'sensitive: left for you' : 'no answer',
      });
      continue;
    }

    let attempt: Attempt;
    try {
      attempt = await fillOne(scope, question, handle, value);
    } catch (error) {
      attempt = { ok: false, reason: `fill failed: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}` };
    }
    if (attempt.ok) {
      result.filled.push(question.label);
    } else {
      opts.log.warn(step, `not entered: ${question.label}`, { questionId: question.id, reason: attempt.reason });
      result.skipped.push({ questionId: question.id, label: question.label, reason: attempt.reason });
    }
  }
  opts.log.info(step, `filled ${result.filled.length}, skipped ${result.skipped.length}`);
  return result;
}

async function fillOne(
  scope: FormScope,
  question: FormQuestion,
  handle: FieldHandle,
  value: string | string[]
): Promise<Attempt> {
  const control = scope.locator(handle.selector).first();
  if ((await control.count()) === 0) return { ok: false, reason: 'field no longer on the page' };

  if (TEXT_KINDS.has(question.kind)) {
    if (typeof value !== 'string') return { ok: false, reason: 'expected text, got a list' };
    return fillText(control, question, value);
  }
  switch (question.kind) {
    case 'select':
      return fillSelect(control, question, value);
    case 'radio':
      if (typeof value !== 'string') return { ok: false, reason: 'expected one choice, got a list' };
      return fillChoices(scope, question, handle, [value]);
    case 'checkbox':
      return fillChoices(scope, question, handle, Array.isArray(value) ? value : [value]);
    case 'combobox':
      if (typeof value !== 'string') return { ok: false, reason: 'expected one choice, got a list' };
      return fillCombobox(scope, control, question, value);
    case 'file':
      if (typeof value !== 'string') return { ok: false, reason: 'expected a file path' };
      return fillFile(control, value);
    default:
      return { ok: false, reason: `unsupported field kind ${question.kind}` };
  }
}

async function fillText(control: Locator, question: FormQuestion, raw: string): Promise<Attempt> {
  const value = question.maxLength && raw.length > question.maxLength ? raw.slice(0, question.maxLength) : raw;
  await control.fill(value, { timeout: 5000 });
  await control.evaluate((el) => {
    el.dispatchEvent(new Event('change', { bubbles: true }));
    (el as HTMLElement).blur();
  });
  const now = await control.inputValue().catch(() => '');
  if (now !== value) return { ok: false, reason: 'value did not stick' };
  return { ok: true };
}

/** Maps each wanted value to a declared option value, or reports the first that is not one. */
function resolveOptionValues(question: FormQuestion, wanted: string[]): { values: string[] } | { bad: string } {
  const values: string[] = [];
  for (const w of wanted) {
    const exact = question.options.find((o) => o.value === w);
    if (exact) {
      values.push(exact.value);
      continue;
    }
    // Tolerate an answer that quotes the visible label of an option whose value differs.
    const byLabel = question.options.find((o) => o.label === w);
    if (byLabel) {
      values.push(byLabel.value);
      continue;
    }
    return { bad: w };
  }
  return { values };
}

async function fillSelect(control: Locator, question: FormQuestion, value: string | string[]): Promise<Attempt> {
  const wanted = Array.isArray(value) ? value : [value];
  if (wanted.length > 1 && !question.multiple) return { ok: false, reason: 'several values for a single select' };
  const resolved = resolveOptionValues(question, wanted);
  if ('bad' in resolved) return { ok: false, reason: `"${resolved.bad}" is not one of the options` };
  await control.selectOption(resolved.values, { timeout: 5000 });
  const selected = await control.evaluate((el) =>
    Array.from((el as HTMLSelectElement).selectedOptions).map((o) => o.value)
  );
  const allIn = resolved.values.every((v) => selected.includes(v));
  return allIn ? { ok: true } : { ok: false, reason: 'selection did not stick' };
}

async function isOn(target: Locator): Promise<boolean> {
  return target.evaluate((el) => {
    if (el instanceof HTMLInputElement) return el.checked;
    return el.getAttribute('aria-pressed') === 'true' || el.getAttribute('aria-checked') === 'true';
  });
}

async function fillChoices(
  scope: FormScope,
  question: FormQuestion,
  handle: FieldHandle,
  wanted: string[]
): Promise<Attempt> {
  if (question.kind === 'checkbox' && wanted.length > 1 && !question.multiple) {
    return { ok: false, reason: 'several values for a single checkbox' };
  }
  const resolved = resolveOptionValues(question, wanted);
  if ('bad' in resolved) return { ok: false, reason: `"${resolved.bad}" is not one of the options` };

  for (const v of resolved.values) {
    const selector = handle.optionSelectors[v];
    if (!selector) return { ok: false, reason: `no control for option "${v}"` };
    const target = scope.locator(selector).first();
    if (await isOn(target)) continue;
    // Native click first: styled radios hide the input under a sibling, so a
    // coordinate click would land on the decoration, but React still hears el.click().
    await target.evaluate((el) => (el as HTMLElement).click());
    if (!(await isOn(target))) {
      await target.check({ force: true, timeout: 2000 }).catch(() => undefined);
    }
    if (!(await isOn(target))) return { ok: false, reason: `option "${v}" did not stay selected` };
  }
  return { ok: true };
}

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

async function fillCombobox(
  scope: FormScope,
  control: Locator,
  question: FormQuestion,
  value: string
): Promise<Attempt> {
  const known = question.options.length > 0;
  let wantLabel = value;
  if (known) {
    const resolved = resolveOptionValues(question, [value]);
    if ('bad' in resolved) return { ok: false, reason: `"${value}" is not one of the options` };
    wantLabel = question.options.find((o) => o.value === resolved.values[0])?.label ?? value;
  }

  const isTextInput = await control.evaluate((el) => el instanceof HTMLInputElement);
  await control.click({ timeout: 3000 });
  if (isTextInput) {
    // Typing filters long lists (Greenhouse country lists have ~250 options)
    // and is the only way an async autocomplete shows anything at all.
    await control.fill(wantLabel, { timeout: 3000 });
  }

  const options = scope.locator('[role="option"]:visible');
  let appeared = await options
    .first()
    .waitFor({ state: 'visible', timeout: OPTION_WAIT_MS })
    .then(() => true)
    .catch(() => false);
  if (!appeared) {
    await control.press('ArrowDown').catch(() => undefined);
    appeared = await options
      .first()
      .waitFor({ state: 'visible', timeout: OPTION_WAIT_MS })
      .then(() => true)
      .catch(() => false);
  }
  if (!appeared) {
    await control.press('Escape').catch(() => undefined);
    return { ok: false, reason: 'dropdown showed no options' };
  }

  const texts = (await options.allInnerTexts()).map(normalize);
  const want = normalize(wantLabel);
  let index = texts.findIndex((t) => t === want);
  if (index < 0 && !known) {
    // Location autocompletes append region/country: "Bengaluru, Karnataka, India".
    index = texts.findIndex((t) => t.startsWith(`${want},`));
  }
  if (index < 0) {
    await control.press('Escape').catch(() => undefined);
    return { ok: false, reason: `no dropdown option exactly matching "${wantLabel}"` };
  }
  const chosenLabel = (await options.nth(index).innerText()).trim();
  await options.nth(index).click({ timeout: 3000 });

  const committed = await control.evaluate(
    (el, args) => {
      const matches = (shown: string, w: string): boolean => {
        const s = shown.replace(/\s+/g, ' ').trim().toLowerCase();
        const x = w.replace(/\s+/g, ' ').trim().toLowerCase();
        return s !== '' && x !== '' && (s.includes(x) || x.includes(s));
      };
      if (el instanceof HTMLInputElement) {
        const scopeEl =
          el.closest('[class*="control"]')?.parentElement ?? el.parentElement?.parentElement ?? el.parentElement;
        const single = scopeEl?.querySelector('[class*="single-value"], [class*="singleValue"]');
        const shown = single?.textContent ?? el.value;
        return matches(shown, args.want) || matches(shown, args.chosen);
      }
      const shown = el.textContent ?? '';
      return matches(shown, args.want) || matches(shown, args.chosen);
    },
    { want: wantLabel, chosen: chosenLabel }
  );
  return committed ? { ok: true } : { ok: false, reason: 'dropdown choice did not commit' };
}

async function fillFile(control: Locator, filePath: string): Promise<Attempt> {
  if (!fs.existsSync(filePath)) return { ok: false, reason: 'file not found on disk' };
  await control.setInputFiles(filePath, { timeout: 5000 });
  const count = await control.evaluate((el) => (el as HTMLInputElement).files?.length ?? 0);
  return count > 0 ? { ok: true } : { ok: false, reason: 'file was not attached' };
}
