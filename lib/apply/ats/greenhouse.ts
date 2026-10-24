/**
 * Greenhouse job boards (boards.greenhouse.io, job-boards.greenhouse.io and the
 * EU host), plus company career pages that embed the board in the grnhse iframe.
 *
 * Markup checked against a live public posting on 2026-09-14
 * (job-boards.greenhouse.io/gitlab/jobs/8556658002): the form is
 * form#application-form on the posting page itself, text inputs carry
 * label[for] + aria-required, custom questions are react-select comboboxes
 * (role=combobox, listbox via aria-controls, options role=option), the resume
 * is a visually-hidden input#resume, and the button is
 * "Submit application" (type=submit). The confirmation page could not be
 * inspected without applying, so it is matched loosely: a /confirmation URL or
 * "Thank you for applying" text.
 */
import type { Page } from 'playwright';
import type { AtsAdapter, AtsContext, ApplyOutcome } from '@/lib/apply/types';
import { detectAts } from './detect';
import type { FormScope } from './form-scan';
import {
  CONFIRM_TIMEOUT_MS,
  clickFirstVisible,
  completeSinglePageForm,
  outcome,
  settle,
  visibleTextMatch,
  type AdapterOptions,
} from './common';

const NAME = 'greenhouse';
const FORM = 'form#application-form, form#application_form';
const EMBED_IFRAME = 'iframe#grnhse_iframe, iframe[src*="greenhouse.io/embed/job_app"]';
const CONFIRM_TEXT = [/thank you for applying/i, /application (has been |was )?(submitted|received)/i];

async function resolveScope(page: Page): Promise<FormScope> {
  const iframe = page.locator(EMBED_IFRAME).first();
  if ((await iframe.count()) === 0) return page;
  const handle = await iframe.elementHandle();
  const frame = handle ? await handle.contentFrame() : null;
  return frame ?? page;
}

export function createGreenhouseAdapter(options: AdapterOptions = {}): AtsAdapter {
  const confirmTimeoutMs = options.confirmTimeoutMs ?? CONFIRM_TIMEOUT_MS;
  return {
    name: NAME,
    matches: (url: URL) => detectAts(url.href).name === NAME,
    async apply(page: Page, ctx: AtsContext): Promise<ApplyOutcome> {
      const step = `ats:${NAME}`;
      await settle(page);
      const scope = await resolveScope(page);
      if (scope !== page) ctx.log.info(step, 'form is inside the embedded Greenhouse iframe');

      const form = scope.locator(FORM).first();
      let found = await form.waitFor({ state: 'attached', timeout: 10_000 }).then(() => true).catch(() => false);
      if (!found) {
        // Older boards keep the form behind an Apply button on the posting.
        const clicked = await clickFirstVisible(scope, ['#apply_button', 'button:has-text("Apply")', 'a:has-text("Apply")']);
        if (clicked) {
          ctx.log.info(step, 'clicked Apply to reveal the form');
          found = await form.waitFor({ state: 'attached', timeout: 10_000 }).then(() => true).catch(() => false);
        }
      }
      if (!found) {
        return outcome(NAME, 'needs_review', 'Greenhouse page opened but no application form was found. Check whether the job is still open.');
      }

      return completeSinglePageForm(page, ctx, {
        atsName: NAME,
        scope,
        rootSelector: FORM,
        submitSelector: `${FORM.split(', ').map((f) => `${f} button[type="submit"]`).join(', ')}, #submit_app`,
        confirmTimeoutMs,
        confirm: async () => {
          const evidence: string[] = [];
          const url = scope.url();
          let path = '';
          try {
            path = new URL(url).pathname;
          } catch {
            path = '';
          }
          if (/\/confirmation\/?$/.test(path)) evidence.push(`confirmation URL: ${url}`);
          const text = await visibleTextMatch(scope, 'h1, h2, h3, [class*="confirmation"], #application_confirmation', CONFIRM_TEXT);
          if (text) evidence.push(`page says "${text}"`);
          return evidence.length > 0 ? evidence : null;
        },
      });
    },
  };
}

export const greenhouseAdapter = createGreenhouseAdapter();
