import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { proofsDir } from '@/lib/naukri/safety';
import { localRunnerVerdict } from '@/lib/apply/local-only';

export async function GET(req: NextRequest) {
  // Screenshots of filled forms carry name, phone and CTC: local owner only.
  const verdict = localRunnerVerdict(req);
  if (!verdict.ok) return new NextResponse(verdict.reason ?? 'Forbidden', { status: 403 });
  const { searchParams } = new URL(req.url);
  const fileParam = searchParams.get('file');

  if (!fileParam) {
    return new NextResponse('Missing file parameter', { status: 400 });
  }

  // Sanitize file parameter to prevent path traversal
  const baseName = path.basename(fileParam);

  // Strictly enforce .png extension and allowed characters
  if (!baseName.endsWith('.png') || !/^[a-zA-Z0-9_-]+\.png$/.test(baseName)) {
    return new NextResponse('Invalid proof filename', { status: 400 });
  }

  const dir = proofsDir();
  const filePath = path.join(dir, baseName);

  // Security check: ensure path does not escape the proofs directory
  const relative = path.relative(dir, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return new NextResponse('Access denied', { status: 403 });
  }

  if (!fs.existsSync(filePath)) {
    return new NextResponse('Screenshot not found or expired', { status: 404 });
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, immutable',
        'Content-Disposition': `inline; filename="${baseName}"`,
      },
    });
  } catch (err) {
    console.error('[api/naukri/proof] Error reading screenshot:', err);
    return new NextResponse('Failed to read screenshot', { status: 500 });
  }
}
