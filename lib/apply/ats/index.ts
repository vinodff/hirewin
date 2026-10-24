/**
 * Entry point for "Apply on company site": pick the adapter for the ATS the
 * job landed on, run it, and turn whatever happens into an ApplyOutcome.
 *
 * Two guarantees are enforced here, outside every adapter, so a bug in one
 * adapter cannot break them:
 *  - nothing throws out of this function; an exception becomes status 'error'
 *    with its message;
 *  - an 'applied' outcome without evidence is downgraded to 'needs_review'.
 *    A status is a claim about the real world and needs proof.
 */
import type { Page } from 'playwright';
import type { ApplyOutcome, AtsAdapter, AtsContext } from '@/lib/apply/types';
import { detectAts } from './detect';
import { greenhouseAdapter } from './greenhouse';
import { leverAdapter } from './lever';
import { ashbyAdapter } from './ashby';
import { smartRecruitersAdapter } from './smartrecruiters';
import { workdayAdapter } from './workday';
import { genericAdapter } from './generic';

export { detectAts } from './detect';
export type { AtsDetection } from './detect';
export { createGreenhouseAdapter } from './greenhouse';
export { createLeverAdapter } from './lever';
export { createAshbyAdapter } from './ashby';
export { createSmartRecruitersAdapter } from './smartrecruiters';
export { createWorkdayAdapter } from './workday';
export { createGenericAdapter } from './generic';

export const adapters: AtsAdapter[] = [
  greenhouseAdapter,
  leverAdapter,
  ashbyAdapter,
  smartRecruitersAdapter,
  workdayAdapter,
];

export interface ApplyExternalOptions {
  /** Override the adapter list (tests use short confirmation timeouts). */
  adapters?: AtsAdapter[];
  generic?: AtsAdapter;
}

const EMBEDDED_GREENHOUSE = 'iframe#grnhse_iframe, iframe[src*="greenhouse.io/embed/job_app"]';

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.split('\n')[0].slice(0, 300);
  return String(error).slice(0, 300);
}

export async function applyOnExternalSite(
  page: Page,
  url: string,
  ctx: AtsContext,
  options: ApplyExternalOptions = {}
): Promise<ApplyOutcome> {
  const list = options.adapters ?? adapters;
  const generic = options.generic ?? genericAdapter;
  const detection = detectAts(url);

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    ctx.log.error('ats:detect', 'invalid external URL', { url });
    return { status: 'error', message: 'The external application URL is not valid.', answers: [], evidence: [], externalUrl: url };
  }

  let adapter = list.find((a) => a.matches(parsed));
  if (!adapter) {
    const embedded = await page.locator(EMBEDDED_GREENHOUSE).count().catch(() => 0);
    if (embedded > 0) adapter = list.find((a) => a.name === 'greenhouse');
  }
  const chosen = adapter ?? generic;
  const atsName = adapter ? chosen.name : detection.name === 'unknown' ? generic.name : detection.name;
  const step = `ats:${chosen.name}`;
  ctx.log.info(step, `external application on ${parsed.hostname}`, {
    detected: detection.name,
    supported: detection.supported,
    adapter: chosen.name,
    submit: ctx.submit,
  });

  let result: ApplyOutcome;
  try {
    if (page.url() === 'about:blank') {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    }
    result = await chosen.apply(page, ctx);
  } catch (error) {
    ctx.log.error(step, 'adapter threw', { error: errorMessage(error) });
    result = { status: 'error', message: `External application failed: ${errorMessage(error)}`, answers: [], evidence: [] };
  }

  if (result.status === 'applied' && result.evidence.length === 0) {
    ctx.log.warn(step, 'adapter reported applied without evidence; downgraded');
    result = { ...result, status: 'needs_review', message: 'Submission could not be proven; check the site.' };
  }

  await ctx.log.screenshot(page, `${chosen.name}-result`).catch(() => null);
  ctx.log.info(step, `outcome: ${result.status}`, { message: result.message });
  return { ...result, atsName, externalUrl: url };
}
