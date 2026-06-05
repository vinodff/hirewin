import { NextRequest, NextResponse } from 'next/server';
import { parsePdf } from '@/lib/pdf-parser';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large — max 5 MB' }, { status: 400 });
  }

  try {
    const bytes = await file.arrayBuffer();
    const text = await parsePdf(Buffer.from(bytes));
    return NextResponse.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to parse PDF';
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
