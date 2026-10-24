/**
 * Orchestrates one auto-apply run: preflight login, then every job in its own
 * tab, a few at a time, each result persisted the moment it is known.
 *
 * startRun() returns immediately with a run id. The HTTP request that starts a
 * run must not be the thing that holds it — ten applications with screening
 * questions take minutes, and a browser tab or request timeout would otherwise
 * decide whether they finish. The UI polls the run record instead.
 *
 * Preflight exists because of what the real logs showed: every job in every
 * earlier run failed identically on a logged-out page. Checking the login once,
 * up front, turns ten identical failures into one clear instruction.
 */
import { randomUUID } from 'crypto';
import type { BrowserContext, Page } from 'playwright';
import { createAnswerEngine } from './answers';
import { applyOnExternalSite } from './ats';
import { beginRun, contextForRun, endRun } from './browser';
import { FileJobLogger } from './logger';
import { applyOnNaukri, checkNaukriLogin } from './naukri';
import { runPool } from './pool';
import { writeRun, type RunRecord } from './run-store';
import type {
  ApplicantProfile,
  ApplyOutcome,
  ApplyStatus,
  ApplyTarget,
  JobContext,
} from './types';
import { MAX_CONCURRENCY } from './limits';

export { MAX_CONCURRENCY, MAX_TARGETS } from './limits';

export function defaultConcurrency(): number {
  const n = Number(process.env.HIREWIN_APPLY_CONCURRENCY);
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), MAX_CONCURRENCY) : 3;
}

export interface StartRunInput {
  targets: ApplyTarget[];
  profile: ApplicantProfile;
  /** False = preview: fill and answer everything, submit nothing. */
  submit: boolean;
  concurrency?: number;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const noop = (): void => undefined;

export function startRun(input: StartRunInput): RunRecord {
  const concurrency = Math.max(1, Math.min(input.concurrency ?? defaultConcurrency(), MAX_CONCURRENCY));
  const run: RunRecord = {
    runId: randomUUID(),
    createdAt: Date.now(),
    finishedAt: null,
    submit: input.submit,
    concurrency,
    fatal: null,
    jobs: input.targets.map((t) => ({
      jobId: t.jobId,
      title: t.title,
      company: t.company,
      jobUrl: t.jobUrl,
      phase: 'queued',
      result: null,
      logs: [],
    })),
  };
  writeRun(run);

  void executeRun(run, input).catch((error) => {
    run.fatal = `Run crashed: ${message(error)}`;
    run.finishedAt = Date.now();
    writeRun(run);
  });

  return run;
}

/** Ends every unfinished job with the same status and a run-level reason. */
function finishFatal(run: RunRecord, reason: string, status: ApplyStatus): void {
  const now = Date.now();
  run.fatal = reason;
  for (const job of run.jobs) {
    if (job.phase === 'done') continue;
    job.phase = 'done';
    job.result = {
      jobId: job.jobId,
      title: job.title,
      company: job.company,
      jobUrl: job.jobUrl,
      status,
      message: reason,
      answers: [],
      evidence: [],
      screenshots: [],
      startedAt: now,
      finishedAt: now,
    };
  }
  run.finishedAt = now;
  writeRun(run);
}

async function preflightLogin(context: BrowserContext): Promise<{ loggedIn: boolean; evidence: string }> {
  const page = await context.newPage();
  try {
    return await checkNaukriLogin(page);
  } catch (error) {
    return { loggedIn: false, evidence: `login check failed: ${message(error)}` };
  } finally {
    await page.close().catch(noop);
  }
}

async function executeRun(run: RunRecord, input: StartRunInput): Promise<void> {
  beginRun();
  let pending: NodeJS.Timeout | null = null;
  // Log lines arrive fast from several tabs; coalesce their writes.
  const persistSoon = (): void => {
    if (pending) return;
    pending = setTimeout(() => {
      pending = null;
      writeRun(run);
    }, 400);
  };

  try {
    let context: BrowserContext;
    try {
      context = await contextForRun();
    } catch (error) {
      finishFatal(run, message(error), 'error');
      return;
    }

    const login = await preflightLogin(context);
    if (!login.loggedIn) {
      finishFatal(
        run,
        `The HireWin browser is not signed in to Naukri (${login.evidence}). Click "Connect Naukri", sign in once in the window that opens, then start again.`,
        'requires_login'
      );
      return;
    }

    const answers = createAnswerEngine();

    await runPool(input.targets, run.concurrency, async (target, index) => {
      const job = run.jobs[index];
      job.phase = 'running';
      writeRun(run);

      const log = new FileJobLogger(run.runId, target.jobId, () => {
        job.logs = log.entries();
        persistSoon();
      });
      const jobContext: JobContext = {
        title: target.title,
        company: target.company,
        location: target.location,
        description: target.description,
      };
      const startedAt = Date.now();
      let page: Page | null = null;
      let outcome: ApplyOutcome;

      try {
        page = await context.newPage();
        log.info('start', `Applying to ${target.title} at ${target.company}`, { url: target.jobUrl, submit: run.submit });
        outcome = await applyOnNaukri(page, {
          profile: input.profile,
          target,
          answers,
          log,
          submit: run.submit,
          applyExternal: (externalPage, url) =>
            applyOnExternalSite(externalPage, url, {
              profile: input.profile,
              job: jobContext,
              answers,
              log,
              submit: run.submit,
            }),
        });
      } catch (error) {
        log.error('crash', message(error));
        if (page) await log.screenshot(page, 'crash');
        outcome = { status: 'error', message: `Unexpected failure: ${message(error)}`, answers: [], evidence: [] };
      } finally {
        if (page) await page.close().catch(noop);
      }

      log.info('result', `${outcome.status}: ${outcome.message}`, { evidence: outcome.evidence.join(' | ') });
      job.result = {
        jobId: target.jobId,
        title: target.title,
        company: target.company,
        jobUrl: target.jobUrl,
        ...outcome,
        screenshots: log.screenshots(),
        startedAt,
        finishedAt: Date.now(),
      };
      job.logs = log.entries();
      job.phase = 'done';
      writeRun(run);
    });

    run.finishedAt = Date.now();
    writeRun(run);
  } finally {
    if (pending) clearTimeout(pending);
    endRun();
  }
}
