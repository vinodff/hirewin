/**
 * Start an auto-apply run (POST) or list recent runs (GET).
 *
 * POST returns 202 with a run id straight away; the work continues in this
 * local Node process and the UI polls /api/apply/runs/[runId].
 */
import { NextRequest, NextResponse } from 'next/server';
import { browserInfo } from '@/lib/apply/browser';
import { localRunnerVerdict } from '@/lib/apply/local-only';
import { startRun } from '@/lib/apply/runner';
import { listRuns } from '@/lib/apply/run-store';
import { parseStartRequest } from '@/lib/apply/validate';
import type { ApplyStatus } from '@/lib/apply/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const verdict = localRunnerVerdict(req);
  if (!verdict.ok) return NextResponse.json({ error: verdict.reason }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body is not valid JSON.' }, { status: 400 });
  }

  const parsed = parseStartRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, details: parsed.details }, { status: 400 });
  }

  // One run at a time: they share one browser profile, and two runs racing
  // over the same jobs could apply twice.
  if (browserInfo().activeRuns > 0) {
    return NextResponse.json({ error: 'A run is already in progress. Wait for it to finish.' }, { status: 409 });
  }

  const run = startRun(parsed.value);
  return NextResponse.json({ runId: run.runId, submit: run.submit, jobs: run.jobs.length }, { status: 202 });
}

export async function GET(req: NextRequest) {
  const verdict = localRunnerVerdict(req);
  if (!verdict.ok) return NextResponse.json({ error: verdict.reason }, { status: 403 });

  const runs = listRuns(15).map((run) => {
    const counts: Partial<Record<ApplyStatus, number>> = {};
    for (const job of run.jobs) {
      if (job.result) counts[job.result.status] = (counts[job.result.status] ?? 0) + 1;
    }
    return {
      runId: run.runId,
      createdAt: run.createdAt,
      finishedAt: run.finishedAt,
      submit: run.submit,
      fatal: run.fatal,
      total: run.jobs.length,
      counts,
    };
  });
  return NextResponse.json({ runs, browser: browserInfo() }, { headers: { 'Cache-Control': 'no-store' } });
}
