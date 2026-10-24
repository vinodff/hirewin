/**
 * Career sites with no adapter: fill what can be filled with confidence, then
 * stop. This adapter has no submit path at all — not behind a flag, not in a
 * branch — because on an unknown site there is no way to recognise a genuine
 * confirmation, and an unprovable "applied" is the one outcome not allowed.
 *
 * "Looks like an application form" is deliberately conservative (adapted from
 * averatec0773/offeros, Apache-2.0, recipes.ts looksLikeApplicationForm): a
 * form must take a file, or ask at least three labelled questions. A newsletter
 * box or a search form gets nothing. A form with a password field is a login
 * or sign-up, and the engine never creates accounts, so it is not filled.
 */
import type { Page } from 'playwright';
import type { Answer, AtsAdapter, AtsContext, ApplyOutcome } from '@/lib/apply/types';
import { ensurePageHelpers, scanForm } from './form-scan';
import { fillAnswers } from './fill';
import { answerStandardFields, clickFirstVisible, detectCaptcha, outcome, settle } from './common';

const NAME = 'generic';
const MIN_LABELLED_FIELDS = 3;
/** Engine answers below this are not typed into an unknown site. */
const MIN_CONFIDENCE = 80;
const APPLY_BUTTON_TEXT = /^\s*apply(\s+now|\s+online|\s+here|\s+for\s+this\s+(job|position|role))?\s*$/i;

type FormSearch = { selector: string | null; sawLogin: boolean };

async function findApplicationForm(page: Page): Promise<FormSearch> {
  await ensurePageHelpers(page);
  return page.evaluate((minLabelled) => {
    const FIELDS = 'input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea';
    let sawLogin = false;
    const forms = Array.from(document.querySelectorAll('form'));
    for (const form of forms) {
      const rect = form.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (form.querySelector('input[type=password]')) {
        sawLogin = true;
        continue;
      }
      const hasFile = form.querySelector('input[type=file]') !== null;
      const labelled = Array.from(form.querySelectorAll(FIELDS)).filter((el) => {
        const id = el.getAttribute('id');
        const hasFor = id ? form.querySelector(`label[for="${CSS.escape(id)}"]`) !== null : false;
        return hasFor || el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby') || el.closest('label') !== null;
      });
      if (hasFile || labelled.length >= minLabelled) {
        form.setAttribute('data-hw-form', '1');
        return { selector: 'form[data-hw-form="1"]', sawLogin };
      }
    }
    return { selector: null, sawLogin };
  }, MIN_LABELLED_FIELDS);
}

async function clickObviousApply(page: Page): Promise<boolean> {
  const candidates = page.locator('a, button, [role="button"]');
  const n = Math.min(await candidates.count(), 200);
  for (let i = 0; i < n; i += 1) {
    const el = candidates.nth(i);
    const text = await el.innerText({ timeout: 500 }).catch(() => '');
    if (!APPLY_BUTTON_TEXT.test(text)) continue;
    if (!(await el.isVisible().catch(() => false))) continue;
    await el.click({ timeout: 5000 });
    return true;
  }
  return false;
}

export function createGenericAdapter(): AtsAdapter {
  return {
    name: NAME,
    matches: () => true,
    async apply(page: Page, ctx: AtsContext): Promise<ApplyOutcome> {
      const step = `ats:${NAME}`;
      await settle(page);

      let search = await findApplicationForm(page);
      if (!search.selector) {
        const clicked = await clickObviousApply(page).catch(() => false);
        if (clicked) {
          ctx.log.info(step, 'clicked an Apply button once to look for the form');
          await settle(page);
          await page.waitForTimeout(1500);
          search = await findApplicationForm(page);
        }
      }

      const challenge = await detectCaptcha(page);
      if (!search.selector) {
        if (challenge) {
          return outcome(NAME, 'captcha', `The career site showed a ${challenge}. Open it in the browser to apply.`);
        }
        const why = search.sawLogin
          ? 'The career site asks you to sign in or create an account first; the engine never does that. Apply there yourself.'
          : 'No application form was found on this career site. Apply there yourself.';
        return outcome(NAME, 'external_unsupported', why);
      }

      const scan = await scanForm(page, { rootSelector: search.selector, excludeSelector: 'input[type=password]' });
      const { answers: fromProfile, remaining } = answerStandardFields(scan.questions, ctx.profile);
      let engine: Answer[] = [];
      if (remaining.length > 0) {
        const ids = new Set(remaining.map((q) => q.id));
        engine = (await ctx.answers.answer(remaining, { profile: ctx.profile, job: ctx.job })).filter((a) => ids.has(a.questionId));
      }
      const confident = engine.filter((a) => !a.sensitive && a.value !== null && a.confidence >= MIN_CONFIDENCE);
      const fill = await fillAnswers(page, scan, [...fromProfile, ...confident], { log: ctx.log, step });
      const answers = [...fromProfile, ...engine];

      if (fill.filled.length === 0) {
        return outcome(NAME, 'external_unsupported', 'Found a form on this career site but could not fill any of it confidently. Apply there yourself.', answers);
      }
      ctx.log.info(step, 'filled what it could; never submits on unknown sites', { filled: fill.filled.length });
      const unresolved = scan.questions.filter((q) => q.required && !fill.filled.includes(q.label)).length;
      return outcome(
        NAME,
        'needs_review',
        `Filled ${fill.filled.length} field(s) on an unsupported career site${unresolved ? `; ${unresolved} required field(s) still need you` : ''}. Not submitted: check everything and submit it yourself.`,
        answers
      );
    },
  };
}

export const genericAdapter = createGenericAdapter();
