/**
 * Ashby (jobs.ashbyhq.com).
 *
 * Markup checked against a live public posting on 2026-09-14
 * (jobs.ashbyhq.com/ashby/7458d4e9-da2e-47bd-98cb-adfda43d42b2/application):
 * a React app with NO <form> element; the application sits in the
 * role=tabpanel #form. Each question is div.ashby-application-form-field-entry
 * with label.ashby-application-form-question-title (required shown by a
 * `_required_` class, not an asterisk); yes/no questions are two
 * button[aria-pressed] plus a hidden checkbox; the location question is an
 * async autocomplete (role=combobox) with no options until typed; radio and
 * checkbox groups live in <fieldset>s, and checkboxes are named after their
 * option. The "Autofill from resume" uploader above the form is excluded: a
 * resume dropped there re-parses and overwrites answers already entered.
 * Submit is button.ashby-application-form-submit-button. The success state was
 * not inspected live; it is matched by the success container class or
 * "Thank you for applying" / "successfully submitted" text.
 */
import type { Page } from 'playwright';
import type { AtsAdapter, AtsContext, ApplyOutcome } from '@/lib/apply/types';
import { detectAts } from './detect';
import {
  CONFIRM_TIMEOUT_MS,
  completeSinglePageForm,
  outcome,
  settle,
  visibleTextMatch,
  type AdapterOptions,
} from './common';

const NAME = 'ashby';
const CONTAINER = '.ashby-application-form-container';
const CONFIRM_TEXT = [
  /thank you for applying/i,
  /application (was |has been )?(successfully )?submitted/i,
  /we('ve| have) received your application/i,
];

/** <org>/<jobId>/application, keeping the query. */
export function ashbyApplicationUrl(current: string): string | null {
  const u = new URL(current);
  const path = u.pathname.replace(/\/+$/, '');
  if (/\/application$/.test(path)) return null;
  const segments = path.split('/').filter(Boolean);
  if (segments.length < 2) return null;
  return `${u.origin}/${segments.slice(0, 2).join('/')}/application${u.search}`;
}

export function createAshbyAdapter(options: AdapterOptions = {}): AtsAdapter {
  const confirmTimeoutMs = options.confirmTimeoutMs ?? CONFIRM_TIMEOUT_MS;
  return {
    name: NAME,
    matches: (url: URL) => detectAts(url.href).name === NAME,
    async apply(page: Page, ctx: AtsContext): Promise<ApplyOutcome> {
      const step = `ats:${NAME}`;
      const target = ashbyApplicationUrl(page.url());
      if (target) {
        ctx.log.info(step, 'opening the application tab', { url: target });
        await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      }
      await settle(page);

      const found = await page.locator(CONTAINER).first().waitFor({ state: 'attached', timeout: 15_000 }).then(() => true).catch(() => false);
      if (!found) {
        return outcome(NAME, 'needs_review', 'Ashby page opened but no application form rendered. The posting may be closed.');
      }
      const hasTabPanel = (await page.locator('#form').count()) > 0;

      return completeSinglePageForm(page, ctx, {
        atsName: NAME,
        scope: page,
        rootSelector: hasTabPanel ? '#form' : null,
        excludeSelector: '.ashby-application-form-autofill-uploader, .ashby-application-form-autofill-input-root',
        submitSelector: 'button.ashby-application-form-submit-button',
        confirmTimeoutMs,
        confirm: async () => {
          const text = await visibleTextMatch(
            page,
            '.ashby-application-form-success-container, h1, h2, h3, p',
            CONFIRM_TEXT
          );
          return text ? [`page says "${text}"`] : null;
        },
      });
    },
  };
}

export const ashbyAdapter = createAshbyAdapter();
