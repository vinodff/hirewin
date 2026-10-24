/** One run's live record: per-job phase, result, answers, evidence and log. Polled by the UI. */
import { NextRequest, NextResponse } from 'next/server';
import { localRunnerVerdict } from '@/lib/apply/local-only';
import { readRun } from '@/lib/apply/run-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const verdict = localRunnerVerdict(req);
  if (!verdict.ok) return NextResponse.json({ error: verdict.reason }, { status: 403 });

  const { runId } = await params;
  let run;
  try {
    run = readRun(runId);
  } catch {
    return NextResponse.json({ error: 'Invalid run id.' }, { status: 400 });
  }
  if (!run) return NextResponse.json({ error: 'Run not found.' }, { status: 404 });
  return NextResponse.json(run, { headers: { 'Cache-Control': 'no-store' } });
}
