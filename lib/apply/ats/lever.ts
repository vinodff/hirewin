/**
 * Lever (jobs.lever.co, jobs.eu.lever.co).
 *
 * Markup checked against a live public posting on 2026-09-14
 * (jobs.lever.co/palantir/ac978161-6f46-4f6b-ad9e-a258e642751c/apply): the
 * application is server-rendered at <posting>/apply as form#application-form;
 * each question is li.application-question with a wrapping <label> whose first
 * child div.application-label holds the text and a span.required "✱"; custom
 * cards use radio/checkbox groups sharing a name and native <select>s; the
 * resume is input[name=resume]; the button is #btn-submit (type=button), which
 * runs an invisible hCaptcha before posting. The thanks page was not inspected
 * (that needs a real submission); it is matched by a /thanks URL or
 * "Application submitted" / "Thank you for your application" text.
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

const NAME = 'lever';
const FORM = 'form#application-form';
const CONFIRM_TEXT = [/application submitted/i, /thank you for (your )?appl(ication|ying)/i];

/** <posting>/apply, keeping the query (Lever's source-tracking parameters). */
export function leverApplyUrl(current: string): string | null {
  const u = new URL(current);
  const path = u.pathname.replace(/\/+$/, '');
  if (/\/apply$/.test(path)) return null;
  const segments = path.split('/').filter(Boolean);
  if (segments.length < 2) return null;
  return `${u.origin}/${segments.slice(0, 2).join('/')}/apply${u.search}`;
}

export function createLeverAdapter(options: AdapterOptions = {}): AtsAdapter {
  const confirmTimeoutMs = options.confirmTimeoutMs ?? CONFIRM_TIMEOUT_MS;
  return {
    name: NAME,
    matches: (url: URL) => detectAts(url.href).name === NAME,
    async apply(page: Page, ctx: AtsContext): Promise<ApplyOutcome> {
      const step = `ats:${NAME}`;
      const applyUrl = leverApplyUrl(page.url());
      if (applyUrl) {
        ctx.log.info(step, 'opening the application page', { url: applyUrl });
        await page.goto(applyUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      }
      await settle(page);

      const found = await page.locator(FORM).first().waitFor({ state: 'attached', timeout: 10_000 }).then(() => true).catch(() => false);
      if (!found) {
        return outcome(NAME, 'needs_review', 'Lever page opened but no application form was found. The posting may be closed.');
      }

      return completeSinglePageForm(page, ctx, {
        atsName: NAME,
        scope: page,
        rootSelector: FORM,
        submitSelector: '#btn-submit, button[data-qa="btn-submit"]',
        confirmTimeoutMs,
        confirm: async () => {
          const evidence: string[] = [];
          const url = page.url();
          if (/\/thanks\/?(\?|$)/.test(new URL(url).pathname + new URL(url).search)) {
            evidence.push(`thanks URL: ${url}`);
          }
          const text = await visibleTextMatch(page, '[data-qa="msg-submit-success"], h1, h2, h3', CONFIRM_TEXT);
          if (text) evidence.push(`page says "${text}"`);
          return evidence.length > 0 ? evidence : null;
        },
      });
    },
  };
}

export const leverAdapter = createLeverAdapter();
