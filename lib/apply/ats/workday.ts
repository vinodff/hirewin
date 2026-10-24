/**
 * Workday (<tenant>.wdN.myworkdayjobs.com).
 *
 * Checked live on 2026-09-14 (nvidia.wd5.myworkdayjobs.com, a public posting):
 * the posting's Apply is a[data-automation-id="adventureButton"] → /apply, which
 * offers Autofill with Resume / Apply Manually / Use My Last Application; Apply
 * Manually opens a wizard whose first step is "Create Account/Sign In". That
 * is the normal case, and this engine never creates accounts or signs in, so it
 * ends as needs_review with that reason.
 *
 * If the owner's own browser profile is already signed in to the tenant (or a
 * tenant allows guest applications), the wizard is walked step by step:
 * fill the step, stop on anything unresolved, click
 * data-automation-id="pageFooterNextButton" until its label says Submit. The
 * signed-in wizard and its confirmation were NOT inspected live (that needs an
 * account); selectors follow Workday's data-automation-id convention and the
 * confirmation must show "Application Submitted" / "Thank you for applying"
 * text, so anything unfamiliar ends as needs_review rather than applied.
 *
 * In preview mode (submit=false) only the first step is filled: "Save and
 * Continue" stores a draft in the candidate's Workday account, which is a
 * write the owner did not ask for.
 */
import type { Page } from 'playwright';
import type { Answer, AtsAdapter, AtsContext, ApplyOutcome } from '@/lib/apply/types';
import { detectAts } from './detect';
import {
  CONFIRM_TIMEOUT_MS,
  anyVisible,
  collectValidationErrors,
  describeBlockers,
  outcome,
  prepareAndFill,
  settle,
  submitAndConfirm,
  visibleTextMatch,
  type AdapterOptions,
} from './common';

const NAME = 'workday';
const MAX_STEPS = 12;
const FOOTER_NEXT = '[data-automation-id="pageFooterNextButton"]';
const FLOW_PAGE = '[data-automation-id="applyFlowPage"]';
const SIGN_IN_MARKERS = [
  '[data-automation-id="signInContent"]',
  '[data-automation-id="createAccountLink"]',
  '[data-automation-id="signInLink"]',
  '[data-automation-id="createAccountSubmitButton"]',
  '[data-automation-id="signInSubmitButton"]',
  'input[type="password"]',
].join(', ');
const CONFIRM_TEXT = [/application submitted/i, /thank you for applying/i, /successfully submitted/i];

async function activeStepLabel(page: Page): Promise<string> {
  const step = page.locator('[data-automation-id="progressBarActiveStep"]').first();
  if ((await step.count()) === 0) return '';
  return (await step.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
}

async function needsAccount(page: Page): Promise<boolean> {
  if (await anyVisible(page, SIGN_IN_MARKERS)) return true;
  return /create account|sign in/i.test(await activeStepLabel(page));
}

/** Waits until the wizard shows a step, a sign-in gate, or nothing recognisable. */
async function waitForWizard(page: Page): Promise<void> {
  await page
    .locator(`${FLOW_PAGE}, ${SIGN_IN_MARKERS}, ${FOOTER_NEXT}, [data-automation-id="applyAdventurePage"]`)
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .catch(() => undefined);
}

export function createWorkdayAdapter(options: AdapterOptions = {}): AtsAdapter {
  const confirmTimeoutMs = options.confirmTimeoutMs ?? CONFIRM_TIMEOUT_MS;
  return {
    name: NAME,
    matches: (url: URL) => detectAts(url.href).name === NAME,
    async apply(page: Page, ctx: AtsContext): Promise<ApplyOutcome> {
      const step = `ats:${NAME}`;
      await settle(page);

      const adventure = page.locator('[data-automation-id="adventureButton"]').first();
      if (await adventure.isVisible().catch(() => false)) {
        ctx.log.info(step, 'clicking Apply on the posting');
        await adventure.click({ timeout: 5000 });
        await settle(page);
      }
      await waitForWizard(page);

      const manually = page.locator('[data-automation-id="applyManually"]').first();
      if (await manually.isVisible().catch(() => false)) {
        ctx.log.info(step, 'choosing Apply Manually');
        await manually.click({ timeout: 5000 });
        await settle(page);
        await waitForWizard(page);
      }

      if (await needsAccount(page)) {
        ctx.log.warn(step, 'Workday requires sign-in or account creation');
        return outcome(
          NAME,
          'needs_review',
          'This Workday site requires signing in or creating an account. The engine never creates accounts; sign in yourself in this browser profile, then run the job again.'
        );
      }

      const answers = new Map<string, Answer>();
      const allAnswers = (): Answer[] => [...answers.values()];

      for (let i = 0; i < MAX_STEPS; i += 1) {
        const label = await activeStepLabel(page);
        ctx.log.info(step, `wizard step ${i + 1}${label ? `: ${label}` : ''}`);
        const hasFlow = (await page.locator(FLOW_PAGE).count()) > 0;

        const res = await prepareAndFill(page, ctx, {
          atsName: NAME,
          scope: page,
          rootSelector: hasFlow ? FLOW_PAGE : null,
        });
        if ('early' in res) return { ...res.early, answers: allAnswers() };
        for (const a of res.prepared.answers) answers.set(`${i}:${a.questionId}`, a);

        if (res.prepared.blockers.length > 0) {
          return outcome(NAME, 'needs_review', describeBlockers(res.prepared.blockers), allAnswers());
        }

        const next = page.locator(FOOTER_NEXT).first();
        if (!(await next.isVisible().catch(() => false))) {
          return outcome(NAME, 'needs_review', 'Workday step filled, but the Next/Submit button was not found.', allAnswers());
        }
        const nextText = (await next.innerText().catch(() => '')).trim();

        if (/submit/i.test(nextText)) {
          if (!ctx.submit) {
            return outcome(NAME, 'needs_review', 'Preview: Workday application filled up to the final Submit; not submitted because submit is off.', allAnswers());
          }
          return submitAndConfirm(
            page,
            ctx,
            {
              atsName: NAME,
              scope: page,
              submitSelector: FOOTER_NEXT,
              confirmTimeoutMs,
              confirm: async () => {
                const text = await visibleTextMatch(page, 'h1, h2, h3, [data-automation-id*="congratulations" i], [role="dialog"]', CONFIRM_TEXT);
                return text ? [`page says "${text}"`] : null;
              },
            },
            allAnswers()
          );
        }

        if (!ctx.submit) {
          return outcome(NAME, 'needs_review', 'Preview: first Workday step filled; later steps not opened because submit is off.', allAnswers());
        }

        const before = await activeStepLabel(page);
        await next.click({ timeout: 5000 });
        const moved = await page
          .waitForFunction(
            (prev) => {
              const el = document.querySelector('[data-automation-id="progressBarActiveStep"]');
              return (el?.textContent ?? '').replace(/\s+/g, ' ').trim() !== prev;
            },
            before,
            { timeout: 10_000 }
          )
          .then(() => true)
          .catch(() => false);
        if (!moved) {
          const errors = await collectValidationErrors(page);
          const why = errors.length > 0 ? `Workday rejected the step: ${errors.join(' | ').slice(0, 400)}` : 'Workday did not move to the next step.';
          return outcome(NAME, 'needs_review', why, allAnswers());
        }
        await settle(page, 3000);
      }
      return outcome(NAME, 'needs_review', `Workday wizard had more than ${MAX_STEPS} steps; stopped.`, allAnswers());
    },
  };
}

export const workdayAdapter = createWorkdayAdapter();
