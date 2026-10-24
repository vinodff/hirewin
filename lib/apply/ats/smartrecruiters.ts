/**
 * SmartRecruiters (jobs.smartrecruiters.com).
 *
 * A posting page links to the one-click application at
 * /oneclick-ui/company/<company>/publication/<uuid>. On 2026-09-14 that page
 * answered a headless browser with a DataDome challenge
 * (iframe from geo.captcha-delivery.com), so the application markup itself
 * could NOT be verified live. This adapter is therefore generic in shape:
 * scan whatever form renders (the scan pierces open shadow roots, which the
 * one-click UI's web components use), submit via a type=submit / "Submit"
 * button, and require confirmation text. A DataDome challenge is reported as
 * 'captcha' and left for the owner, never worked around. Treat SmartRecruiters
 * results with more suspicion than Greenhouse/Lever/Ashby until checked on the
 * owner's real browser profile.
 */
import type { Page } from 'playwright';
import type { AtsAdapter, AtsContext, ApplyOutcome } from '@/lib/apply/types';
import { detectAts } from './detect';
import {
  CONFIRM_TIMEOUT_MS,
  clickFirstVisible,
  completeSinglePageForm,
  detectCaptcha,
  outcome,
  settle,
  visibleTextMatch,
  type AdapterOptions,
} from './common';

const NAME = 'smartrecruiters';
const FORM = 'form';
const CONFIRM_TEXT = [
  /thank you for (your )?appl(ication|ying)/i,
  /application (has been |was )?(sent|submitted|received)/i,
];

export function createSmartRecruitersAdapter(options: AdapterOptions = {}): AtsAdapter {
  const confirmTimeoutMs = options.confirmTimeoutMs ?? CONFIRM_TIMEOUT_MS;
  return {
    name: NAME,
    matches: (url: URL) => detectAts(url.href).name === NAME,
    async apply(page: Page, ctx: AtsContext): Promise<ApplyOutcome> {
      const step = `ats:${NAME}`;
      await settle(page);

      if (!/\/oneclick-ui\//.test(new URL(page.url()).pathname)) {
        const clicked = await clickFirstVisible(page, [
          'a[href*="oneclick-ui"]',
          'button:has-text("I\'m interested")',
          'a:has-text("I\'m interested")',
          'a:has-text("Apply now")',
          'button:has-text("Apply now")',
        ]);
        if (!clicked) {
          return outcome(NAME, 'needs_review', 'SmartRecruiters posting has no apply button that could be found.');
        }
        ctx.log.info(step, 'opened the one-click application');
        await page.waitForURL(/oneclick-ui/, { timeout: 15_000 }).catch(() => undefined);
        await settle(page);
      }

      const challenge = await detectCaptcha(page);
      if (challenge) {
        return outcome(NAME, 'captcha', `SmartRecruiters showed a ${challenge}. Open the application in the browser to continue.`);
      }

      const found = await page.locator(FORM).first().waitFor({ state: 'attached', timeout: 15_000 }).then(() => true).catch(() => false);
      if (!found) {
        return outcome(NAME, 'needs_review', 'SmartRecruiters application form did not render.');
      }

      return completeSinglePageForm(page, ctx, {
        atsName: NAME,
        scope: page,
        rootSelector: FORM,
        submitSelector: 'form button[type="submit"], button[data-test="footer-submit"], button:has-text("Submit")',
        confirmTimeoutMs,
        confirm: async () => {
          const evidence: string[] = [];
          const url = page.url();
          if (/\/(confirmation|success)\/?$/.test(new URL(url).pathname)) evidence.push(`confirmation URL: ${url}`);
          const text = await visibleTextMatch(page, 'h1, h2, h3, [class*="confirmation"], [class*="success"]', CONFIRM_TEXT);
          if (text) evidence.push(`page says "${text}"`);
          // A URL alone is not enough here: the one-click UI's routes were not verified live.
          return text ? evidence : null;
        },
      });
    },
  };
}

export const smartRecruitersAdapter = createSmartRecruitersAdapter();
