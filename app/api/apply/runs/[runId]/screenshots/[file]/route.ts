/**
 * A screenshot from a run. These show filled application forms — name, phone,
 * CTC — so they are served only to the local owner and never cached.
 */
import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import { localRunnerVerdict } from '@/lib/apply/local-only';
import { screenshotPath } from '@/lib/apply/run-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string; file: string }> }
) {
  const verdict = localRunnerVerdict(req);
  if (!verdict.ok) return new NextResponse(verdict.reason ?? 'Forbidden', { status: 403 });

  const { runId, file } = await params;
  let filePath: string | null;
  try {
    filePath = screenshotPath(runId, file);
  } catch {
    return new NextResponse('Invalid run id', { status: 400 });
  }
  if (!filePath) return new NextResponse('Invalid file name', { status: 400 });

  try {
    const bytes = fs.readFileSync(filePath);
    return new NextResponse(bytes, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
